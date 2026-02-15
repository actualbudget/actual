import { describe, expect, it } from 'vitest';

import {
  BadRequestError,
  EnableBankingError,
  EnableBankingSetupError,
  ResourceNotFoundError,
} from '../utils/errors';

describe('EnableBankingError', () => {
  it('should create error with correct error code and message', () => {
    const error = new EnableBankingError('AUTH_FAILED', 'Invalid credentials');

    expect(error.error_code).toBe('AUTH_FAILED');
    expect(error.message).toBe('Invalid credentials');
    expect(error.data()).toEqual({
      error_code: 'AUTH_FAILED',
      error_type: 'Invalid credentials',
    });
  });

  it('should be instanceof Error', () => {
    const error = new EnableBankingError('INTERNAL_ERROR', 'Test error');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(EnableBankingError);
  });
});

describe('EnableBankingSetupError', () => {
  it('should create setup error with correct defaults', () => {
    const error = new EnableBankingSetupError();

    expect(error.error_code).toBe('ENABLEBANKING_NOT_CONFIGURED');
    expect(error.message).toBe('The Enable Banking secrets are not setup yet.');
  });
});

describe('ResourceNotFoundError', () => {
  it('should create not found error with custom message', () => {
    const error = new ResourceNotFoundError('Account not found');

    expect(error.error_code).toBe('NOT_FOUND');
    expect(error.message).toBe('Account not found');
  });
});

describe('BadRequestError', () => {
  it('should create bad request error with custom message', () => {
    const error = new BadRequestError('Missing parameter');

    expect(error.error_code).toBe('BAD_REQUEST');
    expect(error.message).toBe('Missing parameter');
  });
});
