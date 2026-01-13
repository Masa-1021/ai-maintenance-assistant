import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.REGION || 'ap-northeast-1' });
export const docClient = DynamoDBDocumentClient.from(client);

export { GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand, ScanCommand };
