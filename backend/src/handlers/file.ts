import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { getUploadUrl, getDownloadUrl, fileExists } from '../utils/s3';
import { success, error, notFound, serverError } from '../utils/response';

const uploadUrlSchema = z.object({
  filename: z.string().min(1, 'ファイル名は必須です'),
  contentType: z.string().refine(
    (type) => type === 'application/pdf',
    { message: 'PDFファイルのみアップロード可能です' }
  ),
});

function getUserId(event: APIGatewayProxyEvent): string {
  return event.requestContext.authorizer?.claims?.sub || 'anonymous';
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const method = event.httpMethod;
  const path = event.resource;

  try {
    if (path === '/files/upload-url' && method === 'POST') {
      return await getUploadUrlHandler(event);
    }
    if (path === '/files/{key}' && method === 'GET') {
      const key = event.pathParameters?.key;
      if (!key) {
        return error('キーが指定されていません');
      }
      return await getDownloadUrlHandler(key);
    }

    return error('Not found', 404);
  } catch (err) {
    console.error('Error:', err);
    return serverError();
  }
}

async function getUploadUrlHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getUserId(event);
  const body = JSON.parse(event.body || '{}');

  const validation = uploadUrlSchema.safeParse(body);
  if (!validation.success) {
    return error(validation.error.errors[0].message);
  }

  const { filename, contentType } = validation.data;

  // Generate unique key with user ID and timestamp
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `uploads/${userId}/${timestamp}_${sanitizedFilename}`;

  const uploadUrl = await getUploadUrl(key, contentType);

  return success({
    uploadUrl,
    key,
  });
}

async function getDownloadUrlHandler(key: string): Promise<APIGatewayProxyResult> {
  // Decode the key (it may be URL encoded)
  const decodedKey = decodeURIComponent(key);

  // Check if file exists
  const exists = await fileExists(decodedKey);
  if (!exists) {
    return notFound('ファイルが見つかりません');
  }

  const downloadUrl = await getDownloadUrl(decodedKey);

  return success({
    downloadUrl,
  });
}
