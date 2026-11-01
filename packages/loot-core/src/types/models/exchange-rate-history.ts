export type HistoryFilter = {
  quoteCurrency?: string;
  kind?: 'dated' | 'standing' | 'fetched';
  from?: string;
  to?: string;
};

export type BackfillStopReason =
  | 'cancelled'
  | 'rate-limited'
  | 'auth'
  | 'provider-failing'
  | 'not-installed'
  | 'not-configured'
  | 'deadline'
  | 'superseded';
export type BackfillProgress = {
  jobId: string;
  context: string;
  state: 'running' | 'done' | 'stopped';
  stopReason?: BackfillStopReason;
  total: number;
  done: number;
  unprocessed: number;
  inserted: number;
  replaced: number;
  existing: number;
  cached: number;
  missing: number;
  failed: number;
};

export type HistoryRow = {
  id: string;
  quote_currency: string;
  rate: string;
  kind: 'dated' | 'standing' | 'fetched';
  source: string;
  timestamp: string;
};

export type ImportRowClass =
  | 'new'
  | 'unchanged'
  | 'conflict'
  | 'duplicate-in-file'
  | 'conflict-in-file'
  | 'skipped-fetched'
  | 'invalid';
export type ImportRowError =
  | 'invalid-currency'
  | 'invalid-base'
  | 'invalid-rate'
  | 'invalid-kind'
  | 'invalid-date'
  | 'cell-too-long'
  | 'column-count'
  | 'key-mismatch';
export type ImportPreviewRow = {
  line: number;
  class: ImportRowClass;
  error?: ImportRowError;
  quote?: string;
  rate?: string;
  kind?: string;
  date?: string;
  existingRate?: string;
};
export type ImportFileError =
  | {
      status: 'error';
      code:
        | 'file-unreadable'
        | 'file-too-large'
        | 'invalid-encoding'
        | 'empty-file'
        | 'too-many-rows'
        | 'parse-failed';
    }
  | {
      status: 'error';
      code: 'missing-column';
      column: 'quote_currency' | 'rate' | 'kind' | 'date';
    }
  | {
      status: 'error';
      code: 'duplicate-column';
      column: 'quote_currency' | 'rate' | 'kind' | 'date' | 'base_currency';
    };
