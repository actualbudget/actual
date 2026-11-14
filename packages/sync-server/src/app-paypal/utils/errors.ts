import createDebug from 'debug';

const debugSensitive = createDebug('actual-sensitive:paypal');

const debug = createDebug('actual:paypal:errors');

export class PayPalError extends Error {
  error_type: string;
  error_code: string;

  constructor(error_type: string, error_code: string, message?: string) {
    super(message || `PayPal error: ${error_type} - ${error_code}`);
    this.name = 'PayPalError';
    this.error_type = error_type;
    this.error_code = error_code;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body !== 'object' || body === null) {
    return fallback;
  }
  if ('message' in body && typeof body.message === 'string') {
    return body.message;
  }
  if (
    'error_description' in body &&
    typeof body.error_description === 'string'
  ) {
    return body.error_description;
  }
  return fallback;
}

export function handlePayPalError(
  statusCode: number,
  body: unknown,
): PayPalError {
  const bodyStr =
    typeof body === 'string' ? body : JSON.stringify(body ?? 'unknown');
  debug('PayPal API error: status=%d', statusCode);
  debugSensitive('PayPal API error: status=%d body=%s', statusCode, bodyStr);

  const message = errorMessage(body, bodyStr);

  if (statusCode === 401 || statusCode === 403) {
    return new PayPalError('INVALID_INPUT', 'INVALID_ACCESS_TOKEN', message);
  }

  if (statusCode === 429) {
    return new PayPalError(
      'RATE_LIMIT_EXCEEDED',
      'RATE_LIMIT_EXCEEDED',
      message,
    );
  }

  if (statusCode >= 400 && statusCode < 500) {
    return new PayPalError('INVALID_INPUT', 'INVALID_INPUT', message);
  }

  return new PayPalError('INTERNAL_ERROR', 'INTERNAL_ERROR', message);
}
