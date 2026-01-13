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
import { success, error, notFound, serverError } from '../utils/response';

const TABLE_NAME = process.env.EQUIPMENT_TABLE || '';
const RECORD_TABLE_NAME = process.env.RECORD_TABLE || '';

// Validation schemas
const createEquipmentSchema = z.object({
  equipmentId: z.string().min(1, '設備IDは必須です'),
  equipmentName: z.string().min(1, '設備名は必須です'),
});

const updateEquipmentSchema = z.object({
  equipmentId: z.string().min(1).optional(),
  equipmentName: z.string().min(1).optional(),
});

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const pathId = event.pathParameters?.id;

  try {
    switch (method) {
      case 'GET':
        if (pathId) {
          return await getEquipment(pathId);
        }
        return await listEquipment();

      case 'POST':
        return await createEquipment(event);

      case 'PUT':
        if (!pathId) {
          return error('Equipment ID is required');
        }
        return await updateEquipment(pathId, event);

      case 'DELETE':
        if (!pathId) {
          return error('Equipment ID is required');
        }
        return await deleteEquipment(pathId);

      default:
        return error('Method not allowed', 405);
    }
  } catch (err) {
    console.error('Error:', err);
    return serverError();
  }
}

async function listEquipment(): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
    })
  );

  const items = (result.Items || []).map((item) => ({
    id: item.id,
    equipmentId: item.equipmentId,
    equipmentName: item.equipmentName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return success({ items, count: items.length });
}

async function getEquipment(id: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EQUIPMENT#${id}`,
        SK: 'METADATA',
      },
    })
  );

  if (!result.Item) {
    return notFound('Equipment not found');
  }

  return success({
    id: result.Item.id,
    equipmentId: result.Item.equipmentId,
    equipmentName: result.Item.equipmentName,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
  });
}

async function createEquipment(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');

  const validation = createEquipmentSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const { equipmentId, equipmentName } = validation.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `EQUIPMENT#${id}`,
    SK: 'METADATA',
    id,
    equipmentId,
    equipmentName,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  return success(
    {
      id,
      equipmentId,
      equipmentName,
      createdAt: now,
      updatedAt: now,
    },
    201
  );
}

async function updateEquipment(
  id: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');

  const validation = updateEquipmentSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  // Check if equipment exists
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EQUIPMENT#${id}`,
        SK: 'METADATA',
      },
    })
  );

  if (!existing.Item) {
    return notFound('Equipment not found');
  }

  const { equipmentId, equipmentName } = validation.data;
  const now = new Date().toISOString();

  const updatedItem = {
    ...existing.Item,
    equipmentId: equipmentId || existing.Item.equipmentId,
    equipmentName: equipmentName || existing.Item.equipmentName,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedItem,
    })
  );

  return success({
    id: existing.Item.id,
    equipmentId: updatedItem.equipmentId,
    equipmentName: updatedItem.equipmentName,
    createdAt: existing.Item.createdAt,
    updatedAt: updatedItem.updatedAt,
  });
}

async function deleteEquipment(id: string): Promise<APIGatewayProxyResult> {
  // Check if equipment exists
  const existing = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EQUIPMENT#${id}`,
        SK: 'METADATA',
      },
    })
  );

  if (!existing.Item) {
    return notFound('Equipment not found');
  }

  // Check if there are related records
  const relatedRecords = await docClient.send(
    new QueryCommand({
      TableName: RECORD_TABLE_NAME,
      IndexName: 'EquipmentRecordIndex',
      KeyConditionExpression: 'equipmentId = :equipmentId',
      ExpressionAttributeValues: {
        ':equipmentId': id,
      },
      Limit: 1,
    })
  );

  if (relatedRecords.Items && relatedRecords.Items.length > 0) {
    return error('この設備に関連するメンテナンス記録が存在するため削除できません', 400);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EQUIPMENT#${id}`,
        SK: 'METADATA',
      },
    })
  );

  return success({ message: 'Equipment deleted successfully' });
}
