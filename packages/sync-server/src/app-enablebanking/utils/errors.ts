import createDebug from 'debug';

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

export function handleEnableBankingError(
  statusCode: number,
  body: unknown,
): EnableBankingError {
  const bodyStr =
    typeof body === 'string' ? body : JSON.stringify(body ?? 'unknown');
  debug('Enable Banking API error: status=%d body=%s', statusCode, bodyStr);

  const parsed: Record<string, unknown> =
    typeof body === 'object' && body !== null
      ? Object.fromEntries(Object.entries(body))
      : {};
  const message = typeof parsed.message === 'string' ? parsed.message : bodyStr;
  const errorType = typeof parsed.error === 'string' ? parsed.error : 'UNKNOWN';

  if (statusCode === 401 || statusCode === 403) {
    return new EnableBankingError(message, 'INVALID_ACCESS_TOKEN', message);
  }

  if (statusCode === 429) {
    return new EnableBankingError(message, 'RATE_LIMIT_EXCEEDED', message);
  }

  if (statusCode === 404) {
    return new EnableBankingError(message, 'NOT_FOUND', message);
  }

  if (statusCode >= 400 && statusCode < 500) {
    // Check for closed/expired session errors (case-insensitive)
    const lowerErrorType = (errorType || '').toLowerCase();
    const lowerMessage = (message || '').toLowerCase();
    if (
      lowerErrorType === 'closed_session' ||
      lowerErrorType === 'expired_session' ||
      lowerMessage.includes('session') ||
      lowerMessage.includes('expired')
    ) {
      return new EnableBankingError(message, 'INVALID_ACCESS_TOKEN', message);
    }
    return new EnableBankingError(message, 'INVALID_INPUT', message);
  }

  return new EnableBankingError(message, 'INTERNAL_ERROR', message);
}
