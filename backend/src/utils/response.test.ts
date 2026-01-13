import { describe, it, expect } from 'vitest';
import { success, error, notFound, serverError, corsHeaders } from './response';

describe('response utilities', () => {
  describe('corsHeaders', () => {
    it('should contain required CORS headers', () => {
      expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*');
      expect(corsHeaders['Access-Control-Allow-Headers']).toContain('Authorization');
      expect(corsHeaders['Access-Control-Allow-Methods']).toContain('GET');
    });
  });

  describe('success', () => {
    it('should return 200 status code by default', () => {
      const result = success({ message: 'test' });
      expect(result.statusCode).toBe(200);
    });

    it('should return custom status code', () => {
      const result = success({ message: 'created' }, 201);
      expect(result.statusCode).toBe(201);
    });

    it('should wrap data in data property', () => {
      const data = { id: '123', name: 'Test' };
      const result = success(data);
      const body = JSON.parse(result.body);
      expect(body.data).toEqual(data);
    });

    it('should include CORS headers', () => {
      const result = success({});
      expect(result.headers).toEqual(corsHeaders);
    });
  });

  describe('error', () => {
    it('should return 400 status code by default', () => {
      const result = error('Bad request');
      expect(result.statusCode).toBe(400);
    });

    it('should return custom status code', () => {
      const result = error('Unauthorized', 401);
      expect(result.statusCode).toBe(401);
    });

    it('should include error message in body', () => {
      const result = error('Something went wrong');
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Something went wrong');
    });

    it('should include CORS headers', () => {
      const result = error('Error');
      expect(result.headers).toEqual(corsHeaders);
    });
  });

  describe('notFound', () => {
    it('should return 404 status code', () => {
      const result = notFound();
      expect(result.statusCode).toBe(404);
    });

    it('should use default message', () => {
      const result = notFound();
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Resource not found');
    });

    it('should use custom message', () => {
      const result = notFound('User not found');
      const body = JSON.parse(result.body);
      expect(body.error).toBe('User not found');
    });
  });

  describe('serverError', () => {
    it('should return 500 status code', () => {
      const result = serverError();
      expect(result.statusCode).toBe(500);
    });

    it('should use default message', () => {
      const result = serverError();
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
    });

    it('should use custom message', () => {
      const result = serverError('Database connection failed');
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Database connection failed');
    });
  });
});
