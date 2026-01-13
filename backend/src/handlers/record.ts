import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import {
  docClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '../utils/dynamodb';
import { success, error, notFound, serverError, corsHeaders } from '../utils/response';

const RECORD_TABLE = process.env.RECORD_TABLE || '';
const SESSION_TABLE = process.env.CHAT_SESSION_TABLE || '';
const EQUIPMENT_TABLE = process.env.EQUIPMENT_TABLE || '';

// Validation schemas
const createRecordSchema = z.object({
  equipmentId: z.string().min(1, '設備IDは必須です'),
  symptom: z.string().min(1, '症状は必須です'),
  cause: z.string().min(1, '原因は必須です'),
  solution: z.string().min(1, '対策は必須です'),
  pdfKey: z.string().optional(),
  chatSessionId: z.string().optional(),
});

const updateRecordSchema = z.object({
  symptom: z.string().min(1).optional(),
  cause: z.string().min(1).optional(),
  solution: z.string().min(1).optional(),
});

function getUserId(event: APIGatewayProxyEvent): string {
  return event.requestContext.authorizer?.claims?.sub || 'anonymous';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const path = event.resource;
  const recordId = event.pathParameters?.id;

  try {
    if (path === '/records/export' && method === 'GET') {
      return await exportRecords(event);
    }
    if (path === '/records' && method === 'GET') {
      return await listRecords(event);
    }
    if (path === '/records' && method === 'POST') {
      return await createRecord(event);
    }
    if (path === '/records/{id}' && method === 'GET') {
      return await getRecord(recordId!);
    }
    if (path === '/records/{id}' && method === 'PUT') {
      return await updateRecord(recordId!, event);
    }
    if (path === '/records/{id}' && method === 'DELETE') {
      return await deleteRecord(recordId!);
    }

    return error('Not found', 404);
  } catch (err) {
    console.error('Error:', err);
    return serverError();
  }
}

interface RecordItem {
  id?: string;
  equipmentId?: string;
  symptom?: string;
  cause?: string;
  solution?: string;
  pdfKey?: string;
  chatSessionId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function listRecords(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { equipmentId, startDate, endDate, keyword, limit } =
    event.queryStringParameters || {};

  let items: RecordItem[] = [];

  if (equipmentId) {
    // Query by equipment
    const expressionValues: Record<string, string> = {
      ':equipmentId': equipmentId,
    };

    let keyCondition = 'equipmentId = :equipmentId';

    if (startDate && endDate) {
      keyCondition += ' AND createdAt BETWEEN :startDate AND :endDate';
      expressionValues[':startDate'] = startDate;
      expressionValues[':endDate'] = endDate;
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: RECORD_TABLE,
        IndexName: 'EquipmentRecordIndex',
        KeyConditionExpression: keyCondition,
        ExpressionAttributeValues: expressionValues,
        ScanIndexForward: false,
      })
    );
    items = (result.Items || []) as RecordItem[];
  } else if (startDate && endDate) {
    // Query by date range
    const result = await docClient.send(
      new QueryCommand({
        TableName: RECORD_TABLE,
        IndexName: 'CreatedAtIndex',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND createdAt BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
          ':gsi1pk': 'RECORD',
          ':startDate': startDate,
          ':endDate': endDate,
        },
        ScanIndexForward: false,
      })
    );
    items = (result.Items || []) as RecordItem[];
  } else {
    // Scan all
    const result = await docClient.send(
      new ScanCommand({
        TableName: RECORD_TABLE,
        Limit: limit ? parseInt(limit) : 100,
      })
    );
    items = (result.Items || []) as RecordItem[];
  }

  // Filter by keyword if provided
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    items = items.filter(
      (item) =>
        item.symptom?.toLowerCase().includes(lowerKeyword) ||
        item.cause?.toLowerCase().includes(lowerKeyword) ||
        item.solution?.toLowerCase().includes(lowerKeyword)
    );
  }

  // Get equipment names
  const equipmentIds = [...new Set(items.map((item) => item.equipmentId))];
  const equipmentMap: Record<string, string> = {};

  for (const eqId of equipmentIds) {
    if (!eqId) continue;
    const eqResult = await docClient.send(
      new GetCommand({
        TableName: EQUIPMENT_TABLE,
        Key: { PK: `EQUIPMENT#${eqId}`, SK: 'METADATA' },
      })
    );
    if (eqResult.Item) {
      equipmentMap[eqId] = eqResult.Item.equipmentName;
    }
  }

  const formattedItems = items.map((item) => ({
    id: item.id,
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentId ? equipmentMap[item.equipmentId] : undefined,
    symptom: item.symptom,
    cause: item.cause,
    solution: item.solution,
    pdfKey: item.pdfKey,
    chatSessionId: item.chatSessionId,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return success({ items: formattedItems, count: formattedItems.length });
}

async function getRecord(id: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new GetCommand({
      TableName: RECORD_TABLE,
      Key: { PK: `RECORD#${id}`, SK: 'METADATA' },
    })
  );

  if (!result.Item) {
    return notFound('Record not found');
  }

  // Get equipment name
  let equipmentName: string | undefined;
  if (result.Item.equipmentId) {
    const eqResult = await docClient.send(
      new GetCommand({
        TableName: EQUIPMENT_TABLE,
        Key: { PK: `EQUIPMENT#${result.Item.equipmentId}`, SK: 'METADATA' },
      })
    );
    equipmentName = eqResult.Item?.equipmentName;
  }

  return success({
    id: result.Item.id,
    equipmentId: result.Item.equipmentId,
    equipmentName,
    symptom: result.Item.symptom,
    cause: result.Item.cause,
    solution: result.Item.solution,
    pdfKey: result.Item.pdfKey,
    chatSessionId: result.Item.chatSessionId,
    createdBy: result.Item.createdBy,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
  });
}

async function createRecord(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserId(event);
  const body = JSON.parse(event.body || '{}');

  const validation = createRecordSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const { equipmentId, symptom, cause, solution, pdfKey, chatSessionId } = validation.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `RECORD#${id}`,
    SK: 'METADATA',
    GSI1PK: 'RECORD',
    id,
    equipmentId,
    symptom,
    cause,
    solution,
    pdfKey,
    chatSessionId,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: RECORD_TABLE,
      Item: item,
    })
  );

  // Update chat session if provided
  if (chatSessionId) {
    // Find and update the session
    const sessions = await docClient.send(
      new QueryCommand({
        TableName: SESSION_TABLE,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':id': chatSessionId,
        },
      })
    );

    if (sessions.Items && sessions.Items.length > 0) {
      const session = sessions.Items[0];
      await docClient.send(
        new PutCommand({
          TableName: SESSION_TABLE,
          Item: {
            ...session,
            status: 'completed',
            recordId: id,
            updatedAt: now,
          },
        })
      );
    }
  }

  return success(
    {
      id,
      equipmentId,
      symptom,
      cause,
      solution,
      pdfKey,
      chatSessionId,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    },
    201
  );
}

async function updateRecord(
  id: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');

  const validation = updateRecordSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const existing = await docClient.send(
    new GetCommand({
      TableName: RECORD_TABLE,
      Key: { PK: `RECORD#${id}`, SK: 'METADATA' },
    })
  );

  if (!existing.Item) {
    return notFound('Record not found');
  }

  const { symptom, cause, solution } = validation.data;
  const now = new Date().toISOString();

  const updatedItem = {
    ...existing.Item,
    symptom: symptom || existing.Item.symptom,
    cause: cause || existing.Item.cause,
    solution: solution || existing.Item.solution,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: RECORD_TABLE,
      Item: updatedItem,
    })
  );

  return success({
    id: existing.Item.id,
    equipmentId: existing.Item.equipmentId,
    symptom: updatedItem.symptom,
    cause: updatedItem.cause,
    solution: updatedItem.solution,
    pdfKey: existing.Item.pdfKey,
    chatSessionId: existing.Item.chatSessionId,
    createdBy: existing.Item.createdBy,
    createdAt: existing.Item.createdAt,
    updatedAt: updatedItem.updatedAt,
  });
}

async function deleteRecord(id: string): Promise<APIGatewayProxyResult> {
  const existing = await docClient.send(
    new GetCommand({
      TableName: RECORD_TABLE,
      Key: { PK: `RECORD#${id}`, SK: 'METADATA' },
    })
  );

  if (!existing.Item) {
    return notFound('Record not found');
  }

  await docClient.send(
    new DeleteCommand({
      TableName: RECORD_TABLE,
      Key: { PK: `RECORD#${id}`, SK: 'METADATA' },
    })
  );

  return success({ message: 'Record deleted successfully' });
}

async function exportRecords(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Get all records with optional filters
  const listResult = await listRecords(event);
  const listData = JSON.parse(listResult.body);

  if (listData.error) {
    return listResult;
  }

  const records = listData.data.items;

  // Generate CSV
  const headers = ['ID', '設備ID', '設備名', '症状', '原因', '対策', '作成日時', '更新日時'];
  const csvRows = [headers.join(',')];

  for (const record of records) {
    const row = [
      record.id,
      record.equipmentId,
      record.equipmentName || '',
      `"${(record.symptom || '').replace(/"/g, '""')}"`,
      `"${(record.cause || '').replace(/"/g, '""')}"`,
      `"${(record.solution || '').replace(/"/g, '""')}"`,
      record.createdAt,
      record.updatedAt,
    ];
    csvRows.push(row.join(','));
  }

  const csv = csvRows.join('\n');

  return {
    statusCode: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="records_${new Date().toISOString().split('T')[0]}.csv"`,
    },
    body: csv,
  };
}
