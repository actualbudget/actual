// TODO: normalize error types
export class PostError extends Error {
  meta: any;
  reason: string;
  type: 'PostError';

  constructor(reason: string, meta?: any) {
    super('PostError: ' + reason);
    this.type = 'PostError';
    this.reason = reason;
    this.meta = meta;
  }
}

export class HTTPError extends Error {
  statusCode: number;
  responseBody: string;

  constructor(code: number, body: string) {
    super(`HTTPError: unsuccessful status code (${code}): ${body}`);
    this.statusCode = code;
    this.responseBody = body;
  }
}

export class SyncError extends Error {
  meta: any;
  reason: string;

  constructor(reason: string, meta?: any) {
    super('SyncError: ' + reason);
    this.reason = reason;
    this.meta = meta;
  }
}

export class TransactionError extends Error {}

export class RuleError extends Error {
  type: string;

  constructor(name: string, message: string) {
    super('RuleError: ' + message);
    this.type = name;
  }
}

export function APIError(msg: string, meta?: any) {
  return { type: 'APIError', message: msg, meta };
}

export function FileDownloadError(reason: string, meta?: any) {
  return { type: 'FileDownloadError', reason, meta };
}

export function FileUploadError(reason: string, meta?: any) {
  return { type: 'FileUploadError', reason, meta };
}
