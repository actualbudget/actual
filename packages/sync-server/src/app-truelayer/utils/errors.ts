import createDebug from 'debug';

const debugSensitive = createDebug('actual-sensitive:truelayer');

const debug = createDebug('actual:truelayer:errors');

export class TrueLayerError extends Error {
  error_type: string;
  error_code: string;

  constructor(error_type: string, error_code: string, message?: string) {
    super(message || `TrueLayer error: ${error_type} - ${error_code}`);
    this.name = 'TrueLayerError';
    this.error_type = error_type;
    this.error_code = error_code;
  }
}

export function handleTrueLayerError(
  statusCode: number,
  body: unknown,
): TrueLayerError {
  const bodyStr =
    typeof body === 'string' ? body : JSON.stringify(body ?? 'unknown');
  debug('TrueLayer API error: status=%d', statusCode);
  debugSensitive('TrueLayer API error: status=%d body=%s', statusCode, bodyStr);

  const parsed: Record<string, unknown> =
    typeof body === 'object' && body !== null
      ? Object.fromEntries(Object.entries(body))
      : {};
  const errorName = typeof parsed.error === 'string' ? parsed.error : '';
  const message =
    typeof parsed.error_description === 'string'
      ? parsed.error_description
      : errorName || bodyStr;

  if (errorName === 'invalid_client') {
    return new TrueLayerError('INVALID_INPUT', 'INVALID_CLIENT', message);
  }

  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorName === 'invalid_grant' ||
    errorName === 'access_denied'
  ) {
    return new TrueLayerError('ITEM_ERROR', 'ITEM_LOGIN_REQUIRED', message);
  }

  if (statusCode === 429) {
    return new TrueLayerError(
      'RATE_LIMIT_EXCEEDED',
      'RATE_LIMIT_EXCEEDED',
      message,
    );
  }

  if (statusCode === 501 || errorName === 'endpoint_not_supported') {
    return new TrueLayerError(
      'INVALID_INPUT',
      'ENDPOINT_NOT_SUPPORTED',
      message,
    );
  }

  if (statusCode === 404) {
    return new TrueLayerError('INVALID_INPUT', 'NOT_FOUND', message);
  }

  if (statusCode >= 400 && statusCode < 500) {
    return new TrueLayerError('INVALID_INPUT', 'INVALID_INPUT', message);
  }

  return new TrueLayerError('INTERNAL_ERROR', 'INTERNAL_ERROR', message);
}
