import { describe, expect, it } from 'vitest';

import {
  EnableBankingError,
  handleEnableBankingError,
} from '#app-enablebanking/utils/errors';

describe('EnableBankingError', () => {
  it('should create an error with type and code', () => {
    const error = new EnableBankingError(
      'INVALID_INPUT',
      'MISSING_FIELD',
      'oops',
    );
    expect(error.error_type).toBe('INVALID_INPUT');
    expect(error.error_code).toBe('MISSING_FIELD');
    expect(error.message).toBe('oops');
    expect(error.name).toBe('EnableBankingError');
  });

  it('should use default message when not provided', () => {
    const error = new EnableBankingError('INTERNAL_ERROR', 'UNKNOWN');
    expect(error.message).toBe(
      'Enable Banking error: INTERNAL_ERROR - UNKNOWN',
    );
  });
});

describe('handleEnableBankingError', () => {
  it('should return INVALID_ACCESS_TOKEN for 401', () => {
    const error = handleEnableBankingError(401, { message: 'Unauthorized' });
    expect(error.error_type).toBe('Unauthorized');
    expect(error.error_code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('should return INVALID_ACCESS_TOKEN for 403', () => {
    const error = handleEnableBankingError(403, { message: 'Forbidden' });
    expect(error.error_type).toBe('Forbidden');
    expect(error.error_code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('should return RATE_LIMIT_EXCEEDED for 429', () => {
    const error = handleEnableBankingError(429, {
      message: 'Too many requests',
    });
    expect(error.error_type).toBe('Too many requests');
    expect(error.error_code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should return NOT_FOUND for 404', () => {
    const error = handleEnableBankingError(404, { message: 'Not found' });
    expect(error.error_type).toBe('Not found');
    expect(error.error_code).toBe('NOT_FOUND');
  });

  it('should detect session-related errors as INVALID_ACCESS_TOKEN', () => {
    const error = handleEnableBankingError(400, {
      error: 'CLOSED_SESSION',
      message: 'session closed',
    });
    expect(error.error_type).toBe('session closed');
    expect(error.error_code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('should detect EXPIRED_SESSION as INVALID_ACCESS_TOKEN', () => {
    const error = handleEnableBankingError(400, {
      error: 'EXPIRED_SESSION',
      message: 'expired',
    });
    expect(error.error_type).toBe('expired');
    expect(error.error_code).toBe('INVALID_ACCESS_TOKEN');
  });

  it('should return INTERNAL_ERROR for 500+', () => {
    const error = handleEnableBankingError(500, { message: 'Server error' });
    expect(error.error_type).toBe('Server error');
    expect(error.error_code).toBe('INTERNAL_ERROR');
  });

  it('should handle string body', () => {
    const error = handleEnableBankingError(500, 'raw error text');
    expect(error.message).toBe('raw error text');
    expect(error.error_type).toBe('raw error text');
    expect(error.error_code).toBe('INTERNAL_ERROR');
  });

  it('should handle null body', () => {
    const error = handleEnableBankingError(500, null);
    expect(error).toBeInstanceOf(EnableBankingError);
  });
});
