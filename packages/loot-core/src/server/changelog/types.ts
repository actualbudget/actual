/**
 * The dataset (table) the change log reads. Kept as a constant rather than a
 * parameter: the UI is transactions-only, and every rule below is
 * transaction-specific.
 */
export const CHANGELOG_DATASET = 'transactions';

/**
 * The columns the change log displays, in table order, mapped to the raw
 * `transactions` columns that back them.
 */
export const CHANGELOG_COLUMNS = {
  date: 'date',
  account: 'acct',
  payee: 'description',
  notes: 'notes',
  category: 'category',
  amount: 'amount',
} as const;

export type ChangeLogColumn = keyof typeof CHANGELOG_COLUMNS;

/**
 * Raw columns that drive an entry without being displayed. `tombstone` is
 * deliberately NOT treated as a hidden field for filtering purposes: a delete
 * writes nothing else, so dropping it would erase every deletion from the log.
 */
export const TOMBSTONE_COLUMN = 'tombstone';

/**
 * A value that is `null` is genuinely empty. A value that is `undefined` is
 * *unknown*: the message log does not reach far enough back to say what it was
 * (a sync reset, a restored backup, or logging enabled after the fact).
 */
export type ChangeLogValue<T> = T | null | undefined;

export type ChangeLogSnapshot = {
  /** 'YYYY-MM-DD'. */
  date: ChangeLogValue<string>;
  accountName: ChangeLogValue<string>;
  /**
   * The account the transaction sat in, so the UI can link back to it. Null
   * when the id no longer resolves and there is nowhere to link to.
   */
  accountId: ChangeLogValue<string>;
  /** Transfers resolve to the other account's name. */
  payeeName: ChangeLogValue<string>;
  notes: ChangeLogValue<string>;
  categoryName: ChangeLogValue<string>;
  /** Integer cents; negative is a payment, positive a deposit. */
  amount: ChangeLogValue<number>;
};

export type ChangeLogKind = 'created' | 'updated' | 'deleted' | 'restored';

export type ChangeLogEntry = {
  /** Stable React key, `${row}:${newest timestamp of the edit}`. */
  id: string;
  timestamp: string;
  /** Wall-clock millis carried by the timestamp. */
  changedAt: number;
  /** The 16-hex per-budget-file client id that made the change. */
  clientId: string;
  /** The transaction id. */
  row: string;
  kind: ChangeLogKind;
  /** Null for `created` -- there was nothing before. */
  before: ChangeLogSnapshot | null;
  /** Null for `deleted` -- there is nothing after. */
  after: ChangeLogSnapshot | null;
  changed: ChangeLogColumn[];
  /** A leg of a split; the register blanks date/account on these. */
  isSplitChild: boolean;
  /** The row has more history than we are willing to read, so before-values
   * are unknown rather than replayed. */
  historyTruncated: boolean;
};

export type ChangeLogQuery = {
  /** CRDT timestamp; entries strictly before it are returned. */
  cursor?: string | null;
  /** Number of entries to return. */
  limit?: number;
};

export type ChangeLogResult = {
  entries: ChangeLogEntry[];
  /** Pass back as `cursor` for the next page. Null once the log is exhausted. */
  nextCursor: string | null;
  /** The current device's client id, so the UI can label its own changes. */
  currentClientId: string;
  /**
   * False when this budget is not writing to the message log at all, which
   * happens when the feature flag was enabled after the budget was opened.
   */
  isRecording: boolean;
};
