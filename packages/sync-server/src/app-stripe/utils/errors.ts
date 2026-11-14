import createDebug from 'debug';

const debugSensitive = createDebug('actual-sensitive:stripe');

const debug = createDebug('actual:stripe:errors');

export class StripeError extends Error {
  error_type: string;
  error_code: string;

  constructor(error_type: string, error_code: string, message?: string) {
    super(message || `Stripe error: ${error_type} - ${error_code}`);
    this.name = 'StripeError';
    this.error_type = error_type;
    this.error_code = error_code;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return fallback;
  }
  const { error } = body;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }
  return fallback;
}

export function handleStripeError(
  statusCode: number,
  body: unknown,
): StripeError {
  const bodyStr =
    typeof body === 'string' ? body : JSON.stringify(body ?? 'unknown');
  debug('Stripe API error: status=%d', statusCode);
  debugSensitive('Stripe API error: status=%d body=%s', statusCode, bodyStr);

  const message = errorMessage(body, bodyStr);

  if (statusCode === 401 || statusCode === 403) {
    return new StripeError('INVALID_INPUT', 'INVALID_ACCESS_TOKEN', message);
  }

  if (statusCode === 429) {
    return new StripeError(
      'RATE_LIMIT_EXCEEDED',
      'RATE_LIMIT_EXCEEDED',
      message,
    );
  }

  if (statusCode >= 400 && statusCode < 500) {
    return new StripeError('INVALID_INPUT', 'INVALID_INPUT', message);
  }

  return new StripeError('INTERNAL_ERROR', 'INTERNAL_ERROR', message);
}
