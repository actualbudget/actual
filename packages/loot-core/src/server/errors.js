// TODO: normalize error types
export class PostError extends Error {
  constructor(reason, meta) {
    super('PostError: ' + reason);
    this.type = 'PostError';
    this.reason = reason;
    this.meta = meta;
    console.log(reason);
    console.log(meta);
  }
}

export class HTTPError extends Error {
  constructor(code, body) {
    super(`HTTPError: unsuccessful status code (${code}): ${body}`);
    this.statusCode = code;
    this.responseBody = body;
  }
}

export class PlaidError extends Error {
  constructor(res) {
    super(res);
    this.type = 'PlaidSyncError';
    this.error_type = res.error_type;
    this.error_code = res.error_code;
    this.res = res;
  }
}

export class SyncError extends Error {
  constructor(reason, meta) {
    super('SyncError: ' + reason);
    this.reason = reason;
    this.meta = meta;
  }
}

export class TransactionError extends Error {
  // eslint-disable-next-line
  constructor(message) {
    super(message);
  }
}

export class RuleError extends Error {
  constructor(type, message) {
    super('RuleError: ' + message);
    this.type = type;
  }
}

export function APIError(msg, meta) {
  return { type: 'APIError', message: msg, meta };
}

export function FileDownloadError(reason, meta) {
  return { type: 'FileDownloadError', reason, meta };
}

export function FileUploadError(reason, meta) {
  return { type: 'FileUploadError', reason, meta };
}

export function isCodeError(err) {
  return err instanceof ReferenceError || err instanceof SyntaxError;
}
