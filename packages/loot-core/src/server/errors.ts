// TODO: normalize error types
export class PostError extends Error {
  meta: { meta: string } | undefined;
  reason: string;
  type: 'PostError';

  constructor(reason: string, meta?: { meta: string }) {
    super('PostError: ' + reason);
    this.type = 'PostError';
    this.reason = reason;
    this.meta = meta;
  }
}

export class BankSyncError extends Error {
  reason: string;
  category: string;
  code: string;
  type: 'BankSyncError';

  constructor(reason: string, category: string, code: string) {
    super('BankSyncError: ' + reason);
    this.type = 'BankSyncError';
    this.reason = reason;
    this.category = category;
    this.code = code;
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
  meta:
    | {
        isMissingKey: boolean;
      }
    | {
        error: { message: string; stack: string };
        query: { sql: string; params: Array<string | number> };
      }
    | undefined;
  reason: string;

  constructor(
    reason: string,
    meta?:
      | {
          isMissingKey: boolean;
        }
      | {
          error: { message: string; stack: string };
          query: { sql: string; params: Array<string | number> };
        },
  ) {
    super('SyncError: ' + reason);
    this.reason = reason;
    this.meta = meta;
  }
}

export class ValidationError extends Error {}

export class TransactionError extends Error {}

export class RuleError extends Error {
  type: string;

  constructor(name: string, message: string) {
    super('RuleError: ' + message);
    this.type = name;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function APIError(msg: string, meta?: Record<string, any>) {
  return { type: 'APIError', message: msg, meta };
}

export function FileDownloadError(
  reason: string,
  meta?: {
    fileId?: string;
    isMissingKey?: boolean;
    name?: string;
    id?: string;
  },
) {
  return { type: 'FileDownloadError', reason, meta };
}

export function FileUploadError(
  reason: string,
  meta?: { isMissingKey: boolean },
) {
  return { type: 'FileUploadError', reason, meta };
}
