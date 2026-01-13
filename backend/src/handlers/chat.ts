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
import { invokeAI } from '../utils/bedrock';
import { getObjectContent } from '../utils/s3';

const SESSION_TABLE = process.env.CHAT_SESSION_TABLE || '';
const MESSAGE_TABLE = process.env.CHAT_MESSAGE_TABLE || '';

// Validation schemas
const createSessionSchema = z.object({
  equipmentId: z.string().min(1, '設備IDは必須です'),
  title: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1, 'メッセージは必須です'),
  pdfKey: z.string().optional(),
});

function getUserId(event: APIGatewayProxyEvent): string {
  return event.requestContext.authorizer?.claims?.sub || 'anonymous';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const path = event.resource;
  const sessionId = event.pathParameters?.id;

  try {
    // Route to appropriate handler
    if (path === '/chat/sessions' && method === 'GET') {
      return await listSessions(event);
    }
    if (path === '/chat/sessions' && method === 'POST') {
      return await createSession(event);
    }
    if (path === '/chat/sessions/{id}' && method === 'GET') {
      return await getSession(sessionId!);
    }
    if (path === '/chat/sessions/{id}' && method === 'DELETE') {
      return await deleteSession(sessionId!, event);
    }
    if (path === '/chat/sessions/{id}/messages' && method === 'GET') {
      return await listMessages(sessionId!);
    }
    if (path === '/chat/sessions/{id}/messages' && method === 'POST') {
      return await sendMessage(sessionId!, event);
    }

    return error('Not found', 404);
  } catch (err) {
    console.error('Error:', err);
    return serverError();
  }
}

async function listSessions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserId(event);

  const result = await docClient.send(
    new QueryCommand({
      TableName: SESSION_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const items = (result.Items || []).map((item) => ({
    id: item.id,
    equipmentId: item.equipmentId,
    title: item.title,
    status: item.status,
    recordId: item.recordId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  return success({ items, count: items.length });
}

async function createSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserId(event);
  const body = JSON.parse(event.body || '{}');

  const validation = createSessionSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const { equipmentId, title } = validation.data;
  const id = uuidv4();
  const now = new Date().toISOString();

  const item = {
    PK: `USER#${userId}`,
    SK: `SESSION#${now}#${id}`,
    id,
    userId,
    equipmentId,
    title: title || '新規チャット',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: SESSION_TABLE,
      Item: item,
    })
  );

  // Create initial AI message
  const welcomeMessage = {
    PK: `SESSION#${id}`,
    SK: `MSG#${now}#${uuidv4()}`,
    id: uuidv4(),
    sessionId: id,
    role: 'assistant',
    content:
      'こんにちは。設備のメンテナンス記録を作成します。発生した問題について教えてください。症状、原因、対策の情報を整理してお聞きします。',
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: MESSAGE_TABLE,
      Item: welcomeMessage,
    })
  );

  return success(
    {
      id,
      equipmentId,
      title: item.title,
      status: item.status,
      createdAt: now,
      updatedAt: now,
    },
    201
  );
}

async function getSession(id: string): Promise<APIGatewayProxyResult> {
  // Scan to find the session by id (since we don't have a GSI on id)
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: SESSION_TABLE,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    })
  );

  if (!scanResult.Items || scanResult.Items.length === 0) {
    return notFound('Session not found');
  }

  const session = scanResult.Items[0];
  return success({
    id: session.id,
    equipmentId: session.equipmentId,
    title: session.title,
    status: session.status,
    recordId: session.recordId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}

async function deleteSession(
  id: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const userId = getUserId(event);

  // Find the session
  const sessions = await docClient.send(
    new QueryCommand({
      TableName: SESSION_TABLE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':id': id,
      },
    })
  );

  if (!sessions.Items || sessions.Items.length === 0) {
    return notFound('Session not found');
  }

  const session = sessions.Items[0];

  // Delete all messages
  const messages = await docClient.send(
    new QueryCommand({
      TableName: MESSAGE_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SESSION#${id}`,
      },
    })
  );

  for (const msg of messages.Items || []) {
    await docClient.send(
      new DeleteCommand({
        TableName: MESSAGE_TABLE,
        Key: { PK: msg.PK, SK: msg.SK },
      })
    );
  }

  // Delete session
  await docClient.send(
    new DeleteCommand({
      TableName: SESSION_TABLE,
      Key: { PK: session.PK, SK: session.SK },
    })
  );

  return success({ message: 'Session deleted successfully' });
}

async function listMessages(sessionId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: MESSAGE_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SESSION#${sessionId}`,
      },
      ScanIndexForward: true, // Oldest first
    })
  );

  const items = (result.Items || []).map((item) => ({
    id: item.id,
    sessionId: item.sessionId,
    role: item.role,
    content: item.content,
    pdfKey: item.pdfKey,
    createdAt: item.createdAt,
  }));

  return success({ items, count: items.length });
}

async function sendMessage(
  sessionId: string,
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || '{}');

  const validation = sendMessageSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const { content, pdfKey } = validation.data;
  const now = new Date().toISOString();

  // Get conversation history
  const historyResult = await docClient.send(
    new QueryCommand({
      TableName: MESSAGE_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `SESSION#${sessionId}`,
      },
      ScanIndexForward: true,
    })
  );

  const history = (historyResult.Items || []).map((item) => ({
    role: item.role as 'user' | 'assistant',
    content: item.content,
  }));

  // Add user message to history
  history.push({ role: 'user', content });

  // Get PDF content if provided
  let pdfContent: string | undefined;
  if (pdfKey) {
    try {
      pdfContent = await getObjectContent(pdfKey);
    } catch (err) {
      console.error('Error reading PDF:', err);
    }
  }

  // Save user message
  const userMessageId = uuidv4();
  const userMessage = {
    PK: `SESSION#${sessionId}`,
    SK: `MSG#${now}#${userMessageId}`,
    id: userMessageId,
    sessionId,
    role: 'user',
    content,
    pdfKey,
    createdAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: MESSAGE_TABLE,
      Item: userMessage,
    })
  );

  // Get AI response
  const aiResponse = await invokeAI(history, pdfContent);

  // Save assistant message
  const assistantNow = new Date().toISOString();
  const assistantMessageId = uuidv4();
  const assistantMessage = {
    PK: `SESSION#${sessionId}`,
    SK: `MSG#${assistantNow}#${assistantMessageId}`,
    id: assistantMessageId,
    sessionId,
    role: 'assistant',
    content: aiResponse.message,
    createdAt: assistantNow,
  };

  await docClient.send(
    new PutCommand({
      TableName: MESSAGE_TABLE,
      Item: assistantMessage,
    })
  );

  return success({
    userMessage: {
      id: userMessageId,
      role: 'user',
      content,
      pdfKey,
      createdAt: now,
    },
    assistantMessage: {
      id: assistantMessageId,
      role: 'assistant',
      content: aiResponse.message,
      createdAt: assistantNow,
    },
    extractedInfo: aiResponse.extractedInfo,
  });
}
