/**
 * Basic unit tests for the API client module
 */
import { ApiError } from '@/lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('ApiError', () => {
  it('should store status and code', () => {
    const err = new ApiError('Not found', 404, 'NOT_FOUND');
    expect(err.message).toBe('Not found');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.name).toBe('ApiError');
  });

  it('should be an instance of Error', () => {
    const err = new ApiError('Test', 500);
    expect(err instanceof Error).toBe(true);
  });
});
