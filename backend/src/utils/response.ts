import { APIGatewayProxyResult } from 'aws-lambda';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export function success<T>(data: T, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ data }),
  };
}

export function error(message: string, statusCode = 400): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ error: message }),
  };
}

export function notFound(message = 'Resource not found'): APIGatewayProxyResult {
  return error(message, 404);
}

export function serverError(message = 'Internal server error'): APIGatewayProxyResult {
  return error(message, 500);
}
