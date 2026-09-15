import { Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { deserializeValue } from '#server/sync';

import {
  CHANGELOG_COLUMNS,
  CHANGELOG_DATASET,
  TOMBSTONE_COLUMN,
} from './types';
import type { ChangeLogColumn } from './types';

/**
 * Messages written by one `db.update`/`db.insert` share a client and, almost
 * always, a millisecond -- only the HLC counter differs. The window is a small
 * tolerance for a batch that straddles a millisecond boundary, far below the
 * time it takes a person to save two separate edits.
 */
export const GROUP_WINDOW_MS = 250;

/** Messages read per row before we give up on replaying its history. */
export const MAX_ROW_HISTORY = 2000;

/** Rows whose history is loaded in one request. */
export const MAX_HISTORY_ROWS = 20000;

/** Kept in step with `chunk(ids, 200)` in enrich.ts, well under sqlite's limit. */
const ID_CHUNK_SIZE = 200;

/** Raw columns whose value we actually read; everything else only contributes
 * its timestamp to group boundaries. */
const VALUED_COLUMNS: string[] = [
  ...Object.values(CHANGELOG_COLUMNS),
  TOMBSTONE_COLUMN,
];

const RAW_TO_COLUMN = new Map<string, ChangeLogColumn>(
  (Object.entries(CHANGELOG_COLUMNS) as Array<[ChangeLogColumn, string]>).map(
    ([column, raw]) => [raw, column],
  ),
);

export type HistoryMessage = {
  row: string;
  column: string;
  /** Serialized (`S:`/`N:`/`0:`) form, or null for columns we skipped. */
  value: string | null;
  timestamp: string;
  millis: number;
  clientId: string;
};

/** One edit: a run of adjacent messages for a single row. */
export type MessageGroup = {
  row: string;
  clientId: string;
  /** Ascending by timestamp. */
  messages: HistoryMessage[];
  newestTimestamp: string;
};

export function toHistoryMessage(
  row: string,
  column: string,
  value: string | null,
  timestamp: string,
): HistoryMessage | null {
  const parsed = Timestamp.parse(timestamp);
  if (!parsed) {
    return null;
  }

  return {
    row,
    column,
    value,
    timestamp,
    millis: parsed.millis(),
    clientId: parsed.node(),
  };
}

/**
 * Splits one row's ascending message history into edits.
 *
 * The boundary is the gap to the *previous message*, not to the group's first
 * message. Anchoring on the group start would partition a chain differently
 * depending on which end you walk from, and the change log needs a partition
 * that does not depend on scan direction or page boundaries.
 */
export function groupRowHistory(messages: HistoryMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let previous: HistoryMessage | null = null;

  for (const message of messages) {
    const current = groups[groups.length - 1];

    if (
      current &&
      previous &&
      current.clientId === message.clientId &&
      message.millis - previous.millis < GROUP_WINDOW_MS
    ) {
      current.messages.push(message);
      current.newestTimestamp = message.timestamp;
    } else {
      groups.push({
        row: message.row,
        clientId: message.clientId,
        messages: [message],
        newestTimestamp: message.timestamp,
      });
    }

    previous = message;
  }

  return groups;
}

/**
 * Loads the complete message history of the given rows.
 *
 * `ORDER BY row, column, timestamp` matches the
 * `messages_crdt_search(dataset, row, column, timestamp)` index prefix exactly
 * and so sorts nothing; asking for `ORDER BY row, timestamp` instead makes
 * sqlite build a temporary b-tree. The per-row interleave happens in JS below.
 *
 * The CASE keeps us from marshalling values we never display -- notably
 * `raw_synced_data`, which holds an entire bank payload and is rewritten on
 * every sync -- while still returning those messages, because a hidden column's
 * timestamp can bridge two visible ones into a single edit.
 */
export async function loadRowHistories(
  rowIds: string[],
): Promise<Map<string, HistoryMessage[]>> {
  const histories = new Map<string, HistoryMessage[]>();

  const valuedPlaceholders = VALUED_COLUMNS.map(() => '?').join(', ');

  for (let i = 0; i < rowIds.length; i += ID_CHUNK_SIZE) {
    const chunk = rowIds.slice(i, i + ID_CHUNK_SIZE);
    const rowPlaceholders = chunk.map(() => '?').join(', ');

    const rows = await db.all<{
      row: string;
      column: string;
      value: string | null;
      timestamp: string;
    }>(
      `SELECT row, column, timestamp,
              CASE WHEN column IN (${valuedPlaceholders}) THEN value END AS value
         FROM messages_crdt
        WHERE dataset = ? AND row IN (${rowPlaceholders})
        ORDER BY row, column, timestamp`,
      [...VALUED_COLUMNS, CHANGELOG_DATASET, ...chunk],
    );

    for (const raw of rows) {
      const message = toHistoryMessage(
        raw.row,
        raw.column,
        raw.value,
        raw.timestamp,
      );
      if (!message) {
        continue;
      }
      const existing = histories.get(raw.row);
      if (existing) {
        existing.push(message);
      } else {
        histories.set(raw.row, [message]);
      }
    }
  }

  // The query is ordered by column within a row, so restore timestamp order.
  for (const messages of histories.values()) {
    messages.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
  }

  return histories;
}

/** The replayed state of a row's raw columns at a point in its history. */
export type RowState = Map<string, string | number | null | undefined>;

export type ReplayedEdit = {
  group: MessageGroup;
  before: RowState;
  after: RowState;
  changed: ChangeLogColumn[];
  /** The row's first *recorded* edit, which is only its creation if the log
   * reaches back that far -- see `looksLikeInsert`. */
  isFirst: boolean;
  /** The group writes the columns every insert writes, so the row began here. */
  isCreation: boolean;
  tombstoneBefore: boolean;
  tombstoneAfter: boolean;
};

/**
 * Columns `insertWithSchema` always writes, because they are required or carry
 * a schema default. An ordinary edit never writes all of them at once, so their
 * presence separates a genuine creation from the oldest edit that merely
 * happens to survive in a truncated log.
 */
const INSERT_SIGNATURE = ['acct', 'sort_order', 'cleared'];

function looksLikeInsert(group: MessageGroup): boolean {
  const columns = new Set(group.messages.map(message => message.column));
  return INSERT_SIGNATURE.every(column => columns.has(column));
}

/**
 * Walks a row's history forward, capturing the state either side of each edit.
 *
 * `currentValues` supplies columns that have no messages at all. Such a column
 * cannot have changed within the recorded window -- a value only ever arrives
 * via an applied message -- so its present value held throughout. A column that
 * *does* have messages is left `undefined` (unknown) until its first one,
 * rather than guessed at.
 */
export function replayRow(
  groups: MessageGroup[],
  currentValues: Record<string, string | number | null>,
): ReplayedEdit[] {
  const columnsWithHistory = new Set<string>();
  for (const group of groups) {
    for (const message of group.messages) {
      columnsWithHistory.add(message.column);
    }
  }

  const state: RowState = new Map();
  for (const [column, value] of Object.entries(currentValues)) {
    if (!columnsWithHistory.has(column)) {
      state.set(column, value);
    }
  }

  const edits: ReplayedEdit[] = [];

  groups.forEach((group, index) => {
    const before = new Map(state);
    const changed = new Set<ChangeLogColumn>();

    for (const message of group.messages) {
      if (message.value === null) {
        // A column we deliberately did not read; it still bridged this group.
        continue;
      }

      const value = deserializeValue(message.value);
      const previous = state.get(message.column);
      state.set(message.column, value);

      const column = RAW_TO_COLUMN.get(message.column);
      if (column && previous !== value) {
        changed.add(column);
      }
    }

    const isCreation = index === 0 && looksLikeInsert(group);

    if (isCreation) {
      // The row did not exist before this, and an insert skips null fields, so
      // anything still unwritten was empty rather than unknown.
      for (const raw of Object.values(CHANGELOG_COLUMNS)) {
        if (state.get(raw) === undefined) {
          state.set(raw, null);
        }
      }
    }

    edits.push({
      group,
      before,
      after: new Map(state),
      changed: [...changed],
      isFirst: index === 0,
      isCreation,
      tombstoneBefore: before.get(TOMBSTONE_COLUMN) === 1,
      tombstoneAfter: state.get(TOMBSTONE_COLUMN) === 1,
    });
  });

  return edits;
}

/**
 * Whether an edit has anything to show. An edit that only touched columns the
 * change log does not display -- a reorder, a bank sync rewriting
 * `raw_synced_data`, a cleared toggle -- is dropped from the list entirely.
 *
 * Tombstone changes always count: they are how creation and deletion reach the
 * log, and a delete writes nothing else.
 */
export function isVisibleEdit(edit: ReplayedEdit): boolean {
  return (
    edit.changed.length > 0 ||
    edit.isCreation ||
    edit.tombstoneBefore !== edit.tombstoneAfter
  );
}
