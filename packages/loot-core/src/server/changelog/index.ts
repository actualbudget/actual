import { getClock, Timestamp } from '@actual-app/crdt';

import * as db from '#server/db';
import { checkSyncingMode } from '#server/sync';

import { currentValues, isSplitChild, loadLookups, toSnapshot } from './enrich';
import type { ChangeLogLookups } from './enrich';
import {
  groupRowHistory,
  isVisibleEdit,
  loadRowHistories,
  MAX_HISTORY_ROWS,
  MAX_ROW_HISTORY,
  replayRow,
} from './replay';
import type { MessageGroup, ReplayedEdit } from './replay';
import { CHANGELOG_COLUMNS, CHANGELOG_DATASET } from './types';
import type {
  ChangeLogEntry,
  ChangeLogKind,
  ChangeLogQuery,
  ChangeLogResult,
} from './types';

/** Messages read per discovery-scan round. */
const PAGE_SIZE = 500;

/**
 * Upper bound on messages examined per request. A reorder or a bank sync can
 * emit hundreds of consecutive edits the log does not display, and without
 * this the refill loop would keep scanning through them indefinitely.
 */
const MAX_SCAN = 5000;

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type ScanMessage = { row: string; timestamp: string };

type ScanPage = {
  /**
   * The round's messages, newest first, deliberately NOT deduplicated by row:
   * the scan has to be able to stop on one particular message, which means
   * knowing where in the round each row was first seen.
   */
  messages: ScanMessage[];
  hasMore: boolean;
};

/**
 * One round of the discovery scan: the messages in this slice of the log, and
 * so which rows changed in it.
 *
 * The unary `+` on `dataset` is load-bearing, not a typo. With it, sqlite walks
 * the unique timestamp index backwards and stops at LIMIT. Without it, it
 * prefers `messages_crdt_search` on `dataset` and then sorts every transaction
 * message through a temp b-tree to satisfy the ORDER BY. The first page plans
 * correctly either way, so the difference only appears once a cursor exists.
 */
async function scanForRows(
  cursor: string | null,
  pageSize: number,
): Promise<ScanPage> {
  const messages = cursor
    ? await db.all<ScanMessage>(
        `SELECT row, timestamp FROM messages_crdt
           WHERE +dataset = ? AND timestamp < ?
           ORDER BY timestamp DESC LIMIT ?`,
        [CHANGELOG_DATASET, cursor, pageSize + 1],
      )
    : await db.all<ScanMessage>(
        `SELECT row, timestamp FROM messages_crdt
           WHERE +dataset = ?
           ORDER BY timestamp DESC LIMIT ?`,
        [CHANGELOG_DATASET, pageSize + 1],
      );

  const hasMore = messages.length > pageSize;

  return {
    messages: hasMore ? messages.slice(0, pageSize) : messages,
    hasMore,
  };
}

function classify(edit: ReplayedEdit): ChangeLogKind {
  if (edit.tombstoneAfter && !edit.tombstoneBefore) {
    return 'deleted';
  }
  if (edit.tombstoneBefore && !edit.tombstoneAfter) {
    return 'restored';
  }
  // A creation is the row's first recorded edit *and* carries the columns
  // every insert writes. Requiring both means a truncated log reports the
  // oldest surviving edit as an update rather than inventing a creation.
  if (edit.isCreation) {
    return 'created';
  }
  return 'updated';
}

function buildEntry(
  edit: ReplayedEdit,
  lookups: ChangeLogLookups,
  historyTruncated: boolean,
): ChangeLogEntry {
  const kind = classify(edit);
  const newest = edit.group.messages[edit.group.messages.length - 1];

  return {
    id: `${edit.group.row}:${edit.group.newestTimestamp}`,
    timestamp: edit.group.newestTimestamp,
    changedAt: newest.millis,
    clientId: edit.group.clientId,
    row: edit.group.row,
    kind,
    // The badge takes the place of whichever half does not exist. A restore
    // has both halves, but they are identical -- undo puts back the exact
    // prior values -- so the before row is dropped to give the badge somewhere
    // to render rather than showing the same values twice with no marker.
    before:
      kind === 'created' || kind === 'restored'
        ? null
        : toSnapshot(edit.before, lookups),
    after: kind === 'deleted' ? null : toSnapshot(edit.after, lookups),
    changed: edit.changed,
    isSplitChild: isSplitChild(edit.group.row, lookups),
    historyTruncated,
  };
}

/** Ids referenced by the replayed states, so they can be resolved to names. */
function collectReferencedIds(edits: ReplayedEdit[]) {
  const payees = new Set<string>();
  const accounts = new Set<string>();
  const categories = new Set<string>();

  for (const edit of edits) {
    for (const state of [edit.before, edit.after]) {
      const payee = state.get(CHANGELOG_COLUMNS.payee);
      const account = state.get(CHANGELOG_COLUMNS.account);
      const category = state.get(CHANGELOG_COLUMNS.category);
      if (typeof payee === 'string' && payee) {
        payees.add(payee);
      }
      if (typeof account === 'string' && account) {
        accounts.add(account);
      }
      if (typeof category === 'string' && category) {
        categories.add(category);
      }
    }
  }

  return { payees, accounts, categories };
}

/**
 * The scan bounds, overridable so tests can reach the refill and frontier
 * paths without a five-thousand-message fixture. Deliberately a second
 * parameter rather than part of `ChangeLogQuery`: the RPC surface takes only
 * the query.
 */
type ScanLimits = {
  pageSize?: number;
  maxScan?: number;
  /** Rows whose history one request will load; see `MAX_HISTORY_ROWS`. */
  maxRows?: number;
};

export async function getChangeLog(
  { cursor = null, limit = DEFAULT_LIMIT }: ChangeLogQuery = {},
  {
    pageSize = PAGE_SIZE,
    maxScan = MAX_SCAN,
    maxRows = MAX_HISTORY_ROWS,
  }: ScanLimits = {},
): Promise<ChangeLogResult> {
  const clampedLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_LIMIT);
  // A request that took no row at all would hand back the cursor it was given
  // and page forever, so the cap is at least one however it was configured.
  const rowCap = Math.max(1, Math.floor(maxRows));

  // `node()` on the live clock is unpadded, while entries carry the padded form
  // parsed back out of a serialized timestamp. Normalise through the same path
  // so the UI can compare them.
  const currentClientId =
    Timestamp.parse(getClock().timestamp.toString())?.node() ?? '';

  // `applyMessages` only writes the log while syncing is enabled or offline.
  // If it is neither, the log is empty because nothing is recording it, which
  // is worth saying out loud rather than rendering "no changes".
  const isRecording = checkSyncingMode('enabled');

  // Grouping is authoritative per row, never derived from the global message
  // stream: one batch can interleave messages for several rows, which would
  // split a single edit in two.
  const rowGroups = new Map<string, MessageGroup[]>();
  const truncatedRows = new Set<string>();
  const visible: ReplayedEdit[] = [];

  let scanCursor = cursor;
  let frontier: string | null = null;
  let scanned = 0;
  let exhausted = false;

  for (;;) {
    const page = await scanForRows(scanCursor, pageSize);
    scanned += page.messages.length;

    if (page.messages.length === 0) {
      exhausted = true;
      break;
    }

    // Rows are taken newest-first and the round stops *on* the message whose
    // row would exceed the cap, rather than dropping the rest of the round.
    // Dropping it would still walk the frontier past those messages, and the
    // next request's cursor then starts below them, so a row seen only there
    // would never be loaded on any page and its edits would simply vanish.
    const newRows = new Set<string>();
    let stoppedAt = -1;

    for (const [index, message] of page.messages.entries()) {
      if (rowGroups.has(message.row) || newRows.has(message.row)) {
        continue;
      }
      if (rowGroups.size + newRows.size >= rowCap) {
        stoppedAt = index;
        break;
      }
      newRows.add(message.row);
    }

    // The frontier only moves as far as the round actually got. A round cut
    // short stops at the message ABOVE the cut: the next request scans
    // `timestamp < cursor` but drops edits whose newest message is `>= cursor`,
    // so resuming exactly on the cut would rediscover the row and then throw
    // away the very edit the cursor was placed for.
    //
    // `stoppedAt === 0` read nothing from this round, so the frontier stays
    // where the previous one left it. That needs the cap to be full already,
    // which cannot happen on a request's first round, so it is always set.
    if (stoppedAt === -1) {
      frontier = page.messages[page.messages.length - 1].timestamp;
    } else if (stoppedAt > 0) {
      frontier = page.messages[stoppedAt - 1].timestamp;
    }

    if (newRows.size > 0) {
      const histories = await loadRowHistories([...newRows]);

      for (const row of newRows) {
        const history = histories.get(row) ?? [];
        if (history.length > MAX_ROW_HISTORY) {
          // Degrade rather than fail: the edits survive, but their unchanged
          // columns read back as unknown instead of being replayed.
          truncatedRows.add(row);
        }

        const groups = groupRowHistory(
          truncatedRows.has(row) ? history.slice(-MAX_ROW_HISTORY) : history,
        );
        rowGroups.set(row, groups);

        // Visibility depends only on a group's own messages, so it can be
        // decided before the current row values are known.
        for (const edit of replayRow(groups, {})) {
          if (cursor != null && edit.group.newestTimestamp >= cursor) {
            continue;
          }
          if (isVisibleEdit(edit)) {
            visible.push(edit);
          }
        }
      }
    }

    if (stoppedAt !== -1) {
      // Messages remain below the cut whatever `hasMore` says about the round.
      // Leaving `exhausted` false is what makes `nextCursor` point at them.
      break;
    }

    // Edits down to and including the frontier are known-complete: a row we
    // have not discovered yet could own an edit *below* it, which would then
    // have to slot in above entries we had already returned. The frontier
    // itself is safe because `messages_crdt.timestamp` is unique, so the only
    // row that can own an edit ending exactly there is the one whose message
    // set the frontier -- already discovered, with its full history loaded.
    // The boundary has to be inclusive: when a page yields no entries,
    // `nextCursor` falls through to the frontier and the next request skips
    // everything at or above it, so an exclusive filter here would drop such
    // an edit from every page.
    const ready = visible.filter(
      edit => !frontier || edit.group.newestTimestamp >= frontier,
    );

    if (ready.length >= clampedLimit || !page.hasMore || scanned >= maxScan) {
      exhausted = exhausted || !page.hasMore;
      break;
    }

    scanCursor = frontier;
  }

  const ready = exhausted
    ? visible
    : visible.filter(
        edit => !frontier || edit.group.newestTimestamp >= frontier,
      );

  ready.sort((a, b) =>
    a.group.newestTimestamp < b.group.newestTimestamp ? 1 : -1,
  );
  const paged = ready.slice(0, clampedLimit);

  const lookups = await loadLookups(
    [...new Set(paged.map(edit => edit.group.row))],
    collectReferencedIds(paged),
  );

  // Replay again, now over each row's FULL history and with its present values
  // available, so columns that have no messages resolve correctly and the
  // before-state of the page's oldest edit still reflects everything earlier.
  const wanted = new Set(paged.map(edit => edit.group.newestTimestamp));
  const entries: ChangeLogEntry[] = [];

  for (const [row, groups] of rowGroups) {
    if (!paged.some(edit => edit.group.row === row)) {
      continue;
    }
    for (const edit of replayRow(groups, currentValues(row, lookups))) {
      if (wanted.has(edit.group.newestTimestamp)) {
        entries.push(buildEntry(edit, lookups, truncatedRows.has(row)));
      }
    }
  }

  entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  const nextCursor =
    exhausted && ready.length <= clampedLimit
      ? null
      : entries.length > 0
        ? entries[entries.length - 1].timestamp
        : frontier;

  return { entries, nextCursor, currentClientId, isRecording };
}
