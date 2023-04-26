// TODO: normalize error types
export class PostError extends Error {
  meta;
  reason;

  constructor(reason, meta?) {
    super('PostError: ' + reason);
    this.name = 'PostError';
    this.reason = reason;
    this.meta = meta;
  }
}

export class HTTPError extends Error {
  statusCode;
  responseBody;

  constructor(code, body) {
    super(`HTTPError: unsuccessful status code (${code}): ${body}`);
    this.statusCode = code;
    this.responseBody = body;
  }
}

export class SyncError extends Error {
  meta;
  reason;

  constructor(reason, meta?) {
    super('SyncError: ' + reason);
    this.reason = reason;
    this.meta = meta;
  }
}

export class TransactionError extends Error {}

export class RuleError extends Error {
  constructor(name, message) {
    super('RuleError: ' + message);
    this.name = name;
  }
}

export function APIError(msg, meta?) {
  return { name: 'APIError', message: msg, meta };
}

export function FileDownloadError(reason, meta?) {
  return { name: 'FileDownloadError', reason, meta };
}

export function FileUploadError(reason, meta?) {
  return { name: 'FileUploadError', reason, meta };
}

export function isCodeError(err) {
  return err instanceof ReferenceError || err instanceof SyntaxError;
}
