import { describe, expect, it } from 'vitest';

import {
  AccessDeniedError,
  GenericGoCardlessError,
  InvalidInputDataError,
  RateLimitError,
} from '#app-gocardless/errors';
import { GoCardlessApiError } from '#app-gocardless/services/gocardless-api';

import { getGoCardlessErrorDetails } from './gocardless-error-details';

function apiError(status: number, data?: unknown) {
  const error = new GoCardlessApiError(
    `GoCardless API error: ${status}`,
    status,
    {},
  );
  error.response.data = data;
  return error;
}

describe('getGoCardlessErrorDetails', () => {
  it('reads summary and detail off a typed client error', () => {
    const error = new AccessDeniedError(
      apiError(403, {
        summary: 'IP address access denied',
        detail: "Your IP 203.0.113.7 isn't whitelisted to perform this action",
        status_code: 403,
      }),
    );

    expect(getGoCardlessErrorDetails(error)).toEqual({
      status: 403,
      summary: 'IP address access denied',
      detail: "Your IP 203.0.113.7 isn't whitelisted to perform this action",
    });
  });

  it('reads a bare GoCardlessApiError', () => {
    const error = apiError(429, {
      summary: 'Rate limit exceeded',
      detail: 'The rate limit for this resource is 4/day',
    });

    expect(getGoCardlessErrorDetails(error)).toEqual({
      status: 429,
      summary: 'Rate limit exceeded',
      detail: 'The rate limit for this resource is 4/day',
    });
  });

  it('reads the first nested field error GoCardless returns for a 400', () => {
    const error = new InvalidInputDataError(
      apiError(400, {
        country: {
          summary: 'Invalid country choice.',
          detail: '"ZZ" is not a valid choice.',
        },
      }),
    );

    expect(getGoCardlessErrorDetails(error)).toEqual({
      status: 400,
      summary: 'Invalid country choice.',
      detail: '"ZZ" is not a valid choice.',
    });
  });

  it('reads a raw response body carried by GenericGoCardlessError', () => {
    const error = new GenericGoCardlessError({
      summary: 'Institution service unavailable',
      detail: 'The institution is temporarily unavailable',
    });

    expect(getGoCardlessErrorDetails(error)).toEqual({
      summary: 'Institution service unavailable',
      detail: 'The institution is temporarily unavailable',
    });
  });

  it('keeps the status when GoCardless sent no parseable body', () => {
    expect(
      getGoCardlessErrorDetails(new RateLimitError(apiError(429))),
    ).toEqual({
      status: 429,
    });
  });

  it('returns undefined for errors unrelated to the GoCardless API', () => {
    expect(getGoCardlessErrorDetails(new Error('boom'))).toBeUndefined();
    expect(getGoCardlessErrorDetails(undefined)).toBeUndefined();
  });

  it('ignores non-string summary and detail values', () => {
    const error = new AccessDeniedError(
      apiError(403, { summary: { nested: true }, detail: 42 }),
    );

    expect(getGoCardlessErrorDetails(error)).toEqual({ status: 403 });
  });

  it('truncates overlong values so a stray HTML body cannot flood the UI', () => {
    const error = new AccessDeniedError(
      apiError(403, { summary: 'a'.repeat(1000), detail: 'b'.repeat(1000) }),
    );

    const details = getGoCardlessErrorDetails(error);

    expect(details?.summary).toHaveLength(500);
    expect(details?.detail).toHaveLength(500);
  });

  it('does not surface credentials or headers from the error', () => {
    const error = apiError(401, {
      summary: 'Invalid token',
      detail: 'Token is invalid or expired',
      secret_id: 'super-secret-id',
      secret_key: 'super-secret-key',
    });
    error.response.headers = { authorization: 'Bearer super-secret-token' };

    expect(getGoCardlessErrorDetails(error)).toEqual({
      status: 401,
      summary: 'Invalid token',
      detail: 'Token is invalid or expired',
    });
  });
});
