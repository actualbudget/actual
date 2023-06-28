export type Message = {
  column: string;
  dataset: string;
  old?: unknown;
  row: string;
  timestamp: string;
  value: string | number | null;
};

export class SyncError extends Error {
  meta;
  reason;

  constructor(reason, meta?) {
    super('SyncError: ' + reason);
    this.reason = reason;
    this.meta = meta;
  }
}
