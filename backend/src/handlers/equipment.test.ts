import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { handler } from './equipment';
import type { APIGatewayProxyEvent } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);

// Set environment variables
vi.stubEnv('EQUIPMENT_TABLE', 'TestEquipmentTable');
vi.stubEnv('RECORD_TABLE', 'TestRecordTable');

function createMockEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/equipment',
    pathParameters: null,
    queryStringParameters: null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api',
      authorizer: null,
      protocol: 'HTTP/1.1',
      httpMethod: 'GET',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test',
        userArn: null,
      },
      path: '/equipment',
      stage: 'test',
      requestId: 'test-request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'test-resource',
      resourcePath: '/equipment',
    },
    resource: '/equipment',
    ...overrides,
  };
}

describe('Equipment Handler', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('GET /equipment (list)', () => {
    it('should return empty list when no equipment exists', async () => {
      ddbMock.on(ScanCommand).resolves({ Items: [] });

      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.items).toEqual([]);
      expect(body.data.count).toBe(0);
    });

    it('should return list of equipment', async () => {
      const mockItems = [
        {
          id: 'uuid-1',
          equipmentId: 'EQ-001',
          equipmentName: 'Test Equipment 1',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'uuid-2',
          equipmentId: 'EQ-002',
          equipmentName: 'Test Equipment 2',
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];
      ddbMock.on(ScanCommand).resolves({ Items: mockItems });

      const event = createMockEvent({ httpMethod: 'GET' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.items).toHaveLength(2);
      expect(body.data.count).toBe(2);
      expect(body.data.items[0].equipmentId).toBe('EQ-001');
    });
  });

  describe('GET /equipment/{id}', () => {
    it('should return 404 when equipment not found', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const event = createMockEvent({
        httpMethod: 'GET',
        pathParameters: { id: 'non-existent-id' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Equipment not found');
    });

    it('should return equipment when found', async () => {
      const mockItem = {
        id: 'uuid-1',
        equipmentId: 'EQ-001',
        equipmentName: 'Test Equipment',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      ddbMock.on(GetCommand).resolves({ Item: mockItem });

      const event = createMockEvent({
        httpMethod: 'GET',
        pathParameters: { id: 'uuid-1' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.id).toBe('uuid-1');
      expect(body.data.equipmentId).toBe('EQ-001');
    });
  });

  describe('POST /equipment', () => {
    it('should return 400 when equipmentId is missing', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ equipmentName: 'Test' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
    });

    it('should return 400 when equipmentName is missing', async () => {
      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ equipmentId: 'EQ-001' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBeDefined();
    });

    it('should create equipment successfully', async () => {
      ddbMock.on(PutCommand).resolves({});

      const event = createMockEvent({
        httpMethod: 'POST',
        body: JSON.stringify({
          equipmentId: 'EQ-001',
          equipmentName: 'Test Equipment',
        }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.data.equipmentId).toBe('EQ-001');
      expect(body.data.equipmentName).toBe('Test Equipment');
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
    });
  });

  describe('PUT /equipment/{id}', () => {
    it('should return 400 when id is missing', async () => {
      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: null,
        body: JSON.stringify({ equipmentName: 'Updated' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Equipment ID is required');
    });

    it('should return 404 when equipment not found', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: 'non-existent-id' },
        body: JSON.stringify({ equipmentName: 'Updated' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });

    it('should update equipment successfully', async () => {
      const existingItem = {
        PK: 'EQUIPMENT#uuid-1',
        SK: 'METADATA',
        id: 'uuid-1',
        equipmentId: 'EQ-001',
        equipmentName: 'Original Name',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      ddbMock.on(GetCommand).resolves({ Item: existingItem });
      ddbMock.on(PutCommand).resolves({});

      const event = createMockEvent({
        httpMethod: 'PUT',
        pathParameters: { id: 'uuid-1' },
        body: JSON.stringify({ equipmentName: 'Updated Name' }),
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.equipmentName).toBe('Updated Name');
      expect(body.data.equipmentId).toBe('EQ-001');
    });
  });

  describe('DELETE /equipment/{id}', () => {
    it('should return 400 when id is missing', async () => {
      const event = createMockEvent({
        httpMethod: 'DELETE',
        pathParameters: null,
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Equipment ID is required');
    });

    it('should return 404 when equipment not found', async () => {
      ddbMock.on(GetCommand).resolves({ Item: undefined });

      const event = createMockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: 'non-existent-id' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
    });

    it('should return 400 when related records exist', async () => {
      const existingItem = {
        PK: 'EQUIPMENT#uuid-1',
        SK: 'METADATA',
        id: 'uuid-1',
      };
      ddbMock.on(GetCommand).resolves({ Item: existingItem });
      ddbMock.on(QueryCommand).resolves({ Items: [{ id: 'record-1' }] });

      const event = createMockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: 'uuid-1' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('削除できません');
    });

    it('should delete equipment successfully', async () => {
      const existingItem = {
        PK: 'EQUIPMENT#uuid-1',
        SK: 'METADATA',
        id: 'uuid-1',
      };
      ddbMock.on(GetCommand).resolves({ Item: existingItem });
      ddbMock.on(QueryCommand).resolves({ Items: [] });
      ddbMock.on(DeleteCommand).resolves({});

      const event = createMockEvent({
        httpMethod: 'DELETE',
        pathParameters: { id: 'uuid-1' },
      });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.message).toContain('deleted');
    });
  });

  describe('Unsupported methods', () => {
    it('should return 405 for unsupported methods', async () => {
      const event = createMockEvent({ httpMethod: 'PATCH' });
      const result = await handler(event);

      expect(result.statusCode).toBe(405);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Method not allowed');
    });
  });
});
