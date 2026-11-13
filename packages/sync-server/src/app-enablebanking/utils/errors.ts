import createDebug from 'debug';

const debugSensitive = createDebug('actual-sensitive:enable-banking');

const debug = createDebug('actual:enable-banking:errors');

export class EnableBankingError extends Error {
  error_type: string;
  error_code: string;

  constructor(error_type: string, error_code: string, message?: string) {
    super(message || `Enable Banking error: ${error_type} - ${error_code}`);
    this.name = 'EnableBankingError';
    this.error_type = error_type;
    this.error_code = error_code;
  }
}

// Enable Banking error codes that mean the bank authorization is gone and the
// user has to go through the bank's login again.
const SESSION_ENDED_ERRORS = new Set([
  'CLOSED_SESSION',
  'EXPIRED_SESSION',
  'REVOKED_SESSION',
  'SESSION_DOES_NOT_EXIST',
  'WRONG_SESSION_STATUS',
]);

export function handleEnableBankingError(
  statusCode: number,
  body: unknown,
): EnableBankingError {
  const bodyStr =
    typeof body === 'string' ? body : JSON.stringify(body ?? 'unknown');
  debug('Enable Banking API error: status=%d', statusCode);
  debugSensitive(
    'Enable Banking API error: status=%d body=%s',
    statusCode,
    bodyStr,
  );

  const parsed: Record<string, unknown> =
    typeof body === 'object' && body !== null
      ? Object.fromEntries(Object.entries(body))
      : {};
  const message = typeof parsed.message === 'string' ? parsed.message : bodyStr;
  const errorType =
    typeof parsed.error === 'string' ? parsed.error.toUpperCase() : 'UNKNOWN';

  // Check Enable Banking's error code before the HTTP status: a bank's rate
  // limit or timeout passes by itself and must not ask for a new bank login.
  if (errorType === 'ASPSP_RATE_LIMIT_EXCEEDED' || statusCode === 429) {
    return new EnableBankingError(message, 'RATE_LIMIT_EXCEEDED', message);
  }

  if (errorType === 'ASPSP_TIMEOUT' || statusCode === 408) {
    return new EnableBankingError(message, 'TIMED_OUT', message);
  }

  if (
    SESSION_ENDED_ERRORS.has(errorType) ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return new EnableBankingError(message, 'INVALID_ACCESS_TOKEN', message);
  }

  if (statusCode === 404) {
    return new EnableBankingError(message, 'NOT_FOUND', message);
  }

  if (statusCode >= 400 && statusCode < 500) {
    // Without an error code the message is all there is to go on.
    if (errorType === 'UNKNOWN' && /session|expired/i.test(message)) {
      return new EnableBankingError(message, 'INVALID_ACCESS_TOKEN', message);
    }
    return new EnableBankingError(message, 'INVALID_INPUT', message);
  }

  return new EnableBankingError(message, 'INTERNAL_ERROR', message);
}
