// @ts-strict-ignore
import {
  deserializeClock,
  getClock,
  merkle,
  serializeClock,
  Timestamp,
} from '@actual-app/crdt';

import { captureException } from '#platform/exceptions';
import * as asyncStorage from '#platform/server/asyncStorage';
import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import {
  setType as setBudgetType,
  triggerBudgetChanges,
} from '#server/budget/base';
import * as db from '#server/db';
import { PostError, SyncError } from '#server/errors';
import { app } from '#server/main-app';
import { runMutator } from '#server/mutators';
import { postBinary } from '#server/post';
import * as prefs from '#server/prefs';
import { getServer } from '#server/server-config';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import * as undo from '#server/undo';
import { once, sequential } from '#shared/async';
import { isMissingSchemaError } from '#shared/errors';
import { getIn, setIn } from '#shared/util';
import type { MetadataPrefs } from '#types/prefs';

import * as encoder from './encoder';
import { PENDING_MESSAGES_TABLE_SQL } from './messages-pending';
import { rebuildMerkleHash } from './repair';
import {
  deserializeValueSafe,
  isUnknownFormatValue,
  serializeValue,
} from './serialization';
import type { UnknownFormatValue } from './serialization';
import { isError, notifyDeferredMessages, quoteSqlId } from './utils';

export { makeTestMessage } from './make-test-message';
export { resetSync } from './reset';
export { repairSync } from './repair';

const FULL_SYNC_DELAY = 1000;
let SYNCING_MODE = 'enabled';
type SyncingMode = 'enabled' | 'offline' | 'disabled' | 'import';

export function setSyncingMode(mode: SyncingMode) {
  const prevMode = SYNCING_MODE;
  switch (mode) {
    case 'enabled':
      SYNCING_MODE = 'enabled';
      break;
    case 'offline':
      SYNCING_MODE = 'offline';
      break;
    case 'disabled':
      SYNCING_MODE = 'disabled';
      break;
    case 'import':
      SYNCING_MODE = 'import';
      break;
    default:
      throw new Error('setSyncingMode: invalid mode: ' + mode);
  }
  return prevMode;
}

export function checkSyncingMode(mode: SyncingMode): boolean {
  switch (mode) {
    case 'enabled':
      return SYNCING_MODE === 'enabled' || SYNCING_MODE === 'offline';
    case 'disabled':
      return SYNCING_MODE === 'disabled' || SYNCING_MODE === 'import';
    case 'offline':
      return SYNCING_MODE === 'offline';
    case 'import':
      return SYNCING_MODE === 'import';
    default:
      throw new Error('checkSyncingMode: invalid mode: ' + mode);
  }
}

// Record a message that can't be applied yet because it targets schema
// from a newer version. It's replayed by `replayPendingMessages` once a
// migration adds the missing table/column. Only the newest value per
// cell is kept — replay is last-write-wins per cell anyway, and this
// bounds the table while the client stays on an old version.
function deferMessage(msg: Message) {
  // The table may not exist yet when the served migration files are
  // older than the code — create it rather than failing the sync batch
  db.execQuery(PENDING_MESSAGES_TABLE_SQL);
  db.runQuery(
    db.cache(
      `INSERT INTO messages_pending (timestamp, dataset, row, column, value)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(dataset, row, column) DO UPDATE
           SET timestamp = excluded.timestamp, value = excluded.value
           WHERE excluded.timestamp > messages_pending.timestamp`,
    ),
    [
      msg.timestamp.toString(),
      msg.dataset,
      msg.row,
      msg.column,
      serializeValue(msg.value),
    ],
  );
}

// Returns false when the message was deferred because it references
// schema this client doesn't have yet (sent by a newer version).
// Deferral only makes sense for inbound messages; for locally-created
// messages a missing table/column is a bug and must surface as an
// apply-failure.
function apply(
  msg: Message,
  prev?: boolean,
  deferUnknownSchema?: boolean,
): boolean {
  const { dataset, row, column, value } = msg;

  if (dataset === 'prefs') {
    // Do nothing, it doesn't exist in the db
  } else if (dataset === 'spreadsheet_cells') {
    // Legacy dataset keyed by `name`, not `id`, so the write below
    // could never apply; it's a derived cache, so ignore the message
  } else if (isUnknownFormatValue(value)) {
    // The value was serialized by a newer version in a format this one
    // can't decode — defer it whole, like a missing table/column
    if (deferUnknownSchema) {
      deferMessage(msg);
      return false;
    }
    throw new SyncError('invalid-schema', {
      error: { message: 'Unknown value format: ' + value.raw, stack: '' },
      query: {
        sql: `INSERT INTO ${quoteSqlId(dataset)} (id, ${quoteSqlId(column)}) VALUES (?, ?)`,
        params: [row, value.raw],
      },
    });
  } else {
    let query;
    try {
      if (prev) {
        query = {
          sql: `UPDATE ${quoteSqlId(dataset)} SET ${quoteSqlId(column)} = ? WHERE id = ?`,
          params: [value, row],
        };
      } else {
        query = {
          sql: `INSERT INTO ${quoteSqlId(dataset)} (id, ${quoteSqlId(column)}) VALUES (?, ?)`,
          params: [row, value],
        };
      }

      db.runQuery(db.cache(query.sql), query.params);
    } catch (error) {
      if (deferUnknownSchema && isMissingSchemaError(error)) {
        deferMessage(msg);
        return false;
      }
      throw new SyncError('invalid-schema', {
        error: { message: error.message, stack: error.stack },
        query,
      });
    }
  }
  return true;
}

// TODO: convert to `whereIn`
function fetchAll(table: string, ids: string[]) {
  let results = [];

  // was 500, but that caused a stack overflow in Safari
  const batchSize = 100;

  for (let i = 0; i < ids.length; i += batchSize) {
    const partIds = ids.slice(i, i + batchSize);
    let sql;
    let column = `${quoteSqlId(table)}.id`;

    // We have to provide *mapped* data so the spreadsheet works. The functions
    // which trigger budget changes based on data changes assumes data has been
    // mapped. The only mapped data that the budget is concerned about is
    // categories. This is kind of annoying, but we manually map it here
    if (table === 'transactions') {
      sql = `
        SELECT t.*, c.transferId AS category
        FROM transactions t
        LEFT JOIN category_mapping c ON c.id = t.category
      `;
      column = 't.id';
    } else {
      sql = `SELECT * FROM ${quoteSqlId(table)}`;
    }

    sql += ` WHERE `;
    sql += partIds.map(() => `${column} = ?`).join(' OR ');

    try {
      const rows = db.runQuery(sql, partIds, true);
      results = results.concat(rows);
    } catch (error) {
      if (isMissingSchemaError(error)) {
        // The table comes from a newer version of the app; its messages
        // will be deferred by `apply`
        break;
      }
      throw new SyncError('invalid-schema', {
        error: {
          message: error.message,
          stack: error.stack,
        },
        query: { sql, params: partIds },
      });
    }
  }

  return results;
}

// TODO make this type stricter.
type DataMap = Map<string, unknown>;

function fetchData(idsPerTable: Record<string, string[]>): DataMap {
  const data: DataMap = new Map();

  for (const table of Object.keys(idsPerTable)) {
    const rows = fetchAll(table, idsPerTable[table]);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setIn(data, [table, row.id], row);
    }
  }

  return data;
}
type SyncListener = (oldData: DataMap, newData: DataMap) => unknown;
let _syncListeners: SyncListener[] = [];

export function addSyncListener(func: SyncListener) {
  _syncListeners.push(func);

  return () => {
    _syncListeners = _syncListeners.filter(f => f !== func);
  };
}

// Cells per `messages_crdt` lookup in `compareMessages`. The last chunk
// is padded up to one of these sizes so only a handful of distinct
// prepared statements ever live in `db.cache`. 100 terms is well inside
// SQLITE_MAX_EXPR_DEPTH and still uses the messages_crdt_search index.
const COMPARE_CHUNK_SIZES = [1, 10, 100];
const compareMessagesSqlByTermCount = new Map<number, string>();

function compareMessagesSql(termCount: number): string {
  let sql = compareMessagesSqlByTermCount.get(termCount);
  if (sql == null) {
    const term = '(dataset = ? AND row = ? AND column = ? AND timestamp >= ?)';
    sql =
      'SELECT dataset, row, column, timestamp FROM messages_crdt WHERE ' +
      Array(termCount).fill(term).join(' OR ');
    compareMessagesSqlByTermCount.set(termCount, sql);
  }
  return sql;
}

type CompareKey = {
  dataset: string;
  row: string;
  column: string;
  timestamp: string;
};

function cellKey(dataset: string, row: string, column: string): string {
  return `${dataset}\0${row}\0${column}`;
}

// Filters out messages that are already in the crdt log and flags a
// message as "old" when a later value for the same cell already exists.
// Old messages aren't applied but still go into the merkle trie.
//
// This does one query per chunk of distinct cells rather than one per
// message: on the web backend every statement outside a transaction is
// a separate lock/commit cycle against IndexedDB, and bulk edits and
// incoming syncs can carry thousands of messages.
function compareMessages(messages: Message[]): Message[] {
  if (messages.length === 0) {
    return [];
  }

  // The oldest timestamp per cell in this batch. Log rows at or after
  // it cover every message for that cell.
  const cells = new Map<string, CompareKey>();
  for (const message of messages) {
    const { dataset, row, column } = message;
    const timestampStr = message.timestamp.toString();
    const key = cellKey(dataset, row, column);
    const existing = cells.get(key);
    if (!existing || timestampStr < existing.timestamp) {
      cells.set(key, { dataset, row, column, timestamp: timestampStr });
    }
  }

  const loggedTimestamps = new Map<string, string[]>();
  const cellList = [...cells.values()];
  const largestChunk = COMPARE_CHUNK_SIZES[COMPARE_CHUNK_SIZES.length - 1];
  for (let start = 0; start < cellList.length; start += largestChunk) {
    const chunk = cellList.slice(start, start + largestChunk);
    const chunkSize = COMPARE_CHUNK_SIZES.find(size => size >= chunk.length);
    // Pad with a repeated cell so the statement shape matches a bucket
    while (chunk.length < chunkSize) {
      chunk.push(chunk[chunk.length - 1]);
    }

    const params = chunk.flatMap(cell => [
      cell.dataset,
      cell.row,
      cell.column,
      cell.timestamp,
    ]);
    const rows = db.runQuery<
      Pick<db.DbCrdtMessage, 'dataset' | 'row' | 'column' | 'timestamp'>
    >(db.cache(compareMessagesSql(chunkSize)), params, true);

    for (const logged of rows) {
      const key = cellKey(logged.dataset, logged.row, logged.column);
      const timestamps = loggedTimestamps.get(key);
      if (timestamps) {
        timestamps.push(logged.timestamp);
      } else {
        loggedTimestamps.set(key, [logged.timestamp]);
      }
    }
  }

  const newMessages: Message[] = [];
  for (const message of messages) {
    const timestampStr = message.timestamp.toString();
    const logged = loggedTimestamps.get(
      cellKey(message.dataset, message.row, message.column),
    );

    if (!logged) {
      newMessages.push(message);
    } else if (logged.includes(timestampStr)) {
      // Exactly this message is already in the log: nothing to do
    } else if (logged.some(timestamp => timestamp > timestampStr)) {
      // A later message for this cell exists, so this one is old
      newMessages.push({ ...message, old: true });
    } else {
      newMessages.push(message);
    }
  }

  return newMessages;
}

// This is the fast path `apply` function when in "import" mode.
// There's no need to run through the whole sync system when
// importing, but **there is a caveat**: because we don't run sync
// listeners importers should not rely on any functions that use any
// projected state (like rules). We can't fire those because they
// depend on having both old and new data which we don't quere here
function applyMessagesForImport(messages: Message[]): void {
  db.transaction(() => {
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const { dataset } = msg;

      if (!msg.old) {
        try {
          apply(msg);
        } catch {
          apply(msg, true);
        }

        if (dataset === 'prefs') {
          throw new Error('Cannot set prefs while importing');
        }
      }
    }
  });
}

export type Message = {
  column: string;
  dataset: string;
  old?: unknown;
  row: string;
  timestamp: Timestamp;
  value: string | number | null | UnknownFormatValue;
};

async function _applyMessages(messages: Message[], deferUnknownSchema = false) {
  if (checkSyncingMode('import')) {
    applyMessagesForImport(messages);
    return undefined;
  }

  // It's important to not mutate the clock while processing the
  // messages. We only want to mutate it if the transaction succeeds.
  // The merkle variable will be updated while applying the messages and
  // we'll apply it afterwards.
  let clock;
  let currentMerkle;
  if (checkSyncingMode('enabled')) {
    clock = getClock();
    currentMerkle = clock.merkle;
  }

  if (sheet.get()) {
    sheet.get().startCacheBarrier();
  }

  const prefsToSet: MetadataPrefs = {};
  let budgetTypeToSet: Message['value'] | undefined;
  const deferredMessages = new Set<Message>();
  const idsPerTable: Record<string, string[]> = {};
  let oldData: DataMap = new Map();
  let newData: DataMap = new Map();

  // Everything that touches the database runs in one transaction: the
  // crdt lookup, reading the affected rows before and after, and the
  // writes themselves. This transaction is **crucial**: it guarantees
  // that everything is atomically committed to the database, and if
  // any part of it fails everything aborts and nothing is changed. It
  // also matters for speed: on the web backend every statement outside
  // a transaction is a separate lock/commit cycle against IndexedDB. We
  // avoid any side effects to in-memory objects, and apply them after
  // this succeeds.
  db.transaction(() => {
    if (checkSyncingMode('enabled')) {
      // Compare the messages with the existing crdt. This filters out
      // already applied messages and determines if a message is old or
      // not. An "old" message doesn't need to be applied, but it still
      // needs to be put into the merkle trie to maintain the hash.
      messages = compareMessages(messages);
    }

    messages = [...messages].sort((m1, m2) => {
      const t1 = m1.timestamp ? m1.timestamp.toString() : '';
      const t2 = m2.timestamp ? m2.timestamp.toString() : '';
      if (t1 < t2) {
        return -1;
      } else if (t1 > t2) {
        return 1;
      }
      return 0;
    });

    messages.forEach(msg => {
      if (msg.dataset === 'prefs') {
        return;
      }

      if (idsPerTable[msg.dataset] == null) {
        idsPerTable[msg.dataset] = [];
      }
      idsPerTable[msg.dataset].push(msg.row);
    });

    oldData = fetchData(idsPerTable);

    // Now that we have all of the data, go through and apply the
    // messages carefully.
    const added = new Set();

    for (const msg of messages) {
      const { dataset, row, column, timestamp, value } = msg;

      if (!msg.old) {
        const applied = apply(
          msg,
          getIn(oldData, [dataset, row]) || added.has(dataset + row),
          deferUnknownSchema,
        );

        if (applied) {
          if (dataset === 'prefs') {
            // An unknown-format pref value can't be stored or replayed
            // (prefs aren't a table) — leave the local pref as-is
            if (!isUnknownFormatValue(value)) {
              prefsToSet[row] = value;
            }
          } else {
            // Keep track of which items have been added it in this sync
            // so it knows whether they already exist in the db or not. We
            // ignore any changes to the spreadsheet.
            added.add(dataset + row);

            // Special treatment for some synced prefs. Applied messages
            // only — an old or deferred message must not flip the
            // in-memory budget type. Remember it here and switch after
            // the commit: switching mutates the in-memory spreadsheet,
            // which a rollback could not undo
            if (dataset === 'preferences' && row === 'budgetType') {
              budgetTypeToSet = value;
            }
          }
        } else {
          // Deferred messages must not be tracked in `added`: their
          // row wasn't created, so a later message for a known column
          // still needs to INSERT it
          deferredMessages.add(msg);
        }
      }

      if (checkSyncingMode('enabled')) {
        db.runQuery(
          db.cache(`INSERT INTO messages_crdt (timestamp, dataset, row, column, value)
         VALUES (?, ?, ?, ?, ?)`),
          [timestamp.toString(), dataset, row, column, serializeValue(value)],
        );

        currentMerkle = merkle.insert(currentMerkle, timestamp);
      }
    }

    if (checkSyncingMode('enabled')) {
      currentMerkle = merkle.prune(currentMerkle);

      // Save the clock in the db first (queries might throw
      // exceptions)
      db.runQuery(
        db.cache(
          'INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)',
        ),
        [serializeClock({ ...clock, merkle: currentMerkle })],
      );
    }

    newData = fetchData(idsPerTable);
  });

  // The transaction succeeded, so we can update in-memory objects now
  undo.appendMessages(messages, oldData);

  if (budgetTypeToSet !== undefined) {
    void setBudgetType(budgetTypeToSet);
  }

  if (checkSyncingMode('enabled')) {
    // Update the in-memory clock.
    clock.merkle = currentMerkle;
  }

  // Save any synced prefs
  if (Object.keys(prefsToSet).length > 0) {
    void prefs.savePrefs(prefsToSet, { avoidSync: true });
    connection.send('prefs-updated');
  }

  // In testing, sometimes the spreadsheet isn't loaded, and that's ok
  if (sheet.get()) {
    // Need to clean up these APIs and make them consistent
    sheet.startTransaction();
    triggerBudgetChanges(oldData, newData);
    sheet.get().triggerDatabaseChanges(oldData, newData);
    sheet.endTransaction();

    // Transfers insert the source row in one sync batch and the counterparty in
    // a second. triggerDatabaseChanges should dirty aggregate query cells, but
    // explicitly recompute global account totals so the second batch always
    // refreshes sidebar "All accounts" / On budget / etc. (see bindings.ts).
    if (idsPerTable.transactions?.length) {
      const s = sheet.get();
      const globalAggregateCells = [
        'accounts-balance',
        'onbudget-accounts-balance',
        'offbudget-accounts-balance',
        'closed-accounts-balance',
      ] as const;
      for (const cellName of globalAggregateCells) {
        const fullName = resolveName('__global', cellName);
        if (s.hasCell(fullName)) {
          s.recompute(fullName);
        }
      }
    }

    // Allow the cache to be used in the future. At this point it's guaranteed
    // to be up-to-date because we are done mutating any other data
    sheet.get().endCacheBarrier();
  }

  _syncListeners.forEach(func => func(oldData, newData));

  // Only tables that actually changed — deferred messages wrote
  // nothing, so they must not trigger client cache invalidation
  const tables = getTablesFromMessages(
    messages.filter(msg => !msg.old && !deferredMessages.has(msg)),
  );
  app.events.emit('sync', {
    type: 'applied',
    tables,
    data: newData,
    prevData: oldData,
  });

  if (deferredMessages.size > 0) {
    notifyDeferredMessages();
  }

  // Deferred messages wrote nothing, so they don't count as received
  // — this also keeps their tables out of the `success` event in
  // `fullSync`. Old messages stay: they were processed (merkled),
  // just superseded.
  return deferredMessages.size === 0
    ? messages
    : messages.filter(msg => !deferredMessages.has(msg));
}

export const applyMessages = sequential(_applyMessages);

export function receiveMessages(messages: Message[]): Promise<Message[]> {
  try {
    // Receiving the latest timestamp preserves the clock and drift check while
    // advancing the counter once per batch.
    let latest = null;
    for (const { timestamp } of messages) {
      if (
        latest === null ||
        timestamp.millis() > latest.millis() ||
        (timestamp.millis() === latest.millis() &&
          timestamp.counter() > latest.counter())
      ) {
        latest = timestamp;
      }
    }
    if (latest !== null) {
      Timestamp.recv(latest);
    }
  } catch (e) {
    if (e instanceof Timestamp.ClockDriftError) {
      throw new SyncError('clock-drift');
    }
    throw e;
  }

  // Inbound messages may come from a newer version of the app, so
  // unknown-schema errors defer instead of failing the batch
  return runMutator(() => applyMessages(messages, true));
}

async function errorHandler(e: Error) {
  captureException(e);

  if (e instanceof SyncError) {
    if (e.reason === 'invalid-schema') {
      // We know this message came from a local modification, and it
      // couldn't apply, which doesn't make any sense. Must be a bug
      // in the code. Send a specific error type for it for a custom
      // message.
      app.events.emit('sync', {
        type: 'error',
        subtype: 'apply-failure',
        meta: e.meta,
      });
    } else {
      app.events.emit('sync', { type: 'error', meta: e.meta });
    }
  } else if (e instanceof Timestamp.ClockDriftError) {
    app.events.emit('sync', {
      type: 'error',
      subtype: 'clock-drift',
      meta: { message: e.message },
    });
  }
}

async function _sendMessages(messages: Message[]): Promise<void> {
  try {
    await applyMessages(messages);
  } catch (e) {
    void errorHandler(e);
    throw e;
  }

  await scheduleFullSync();
}

let IS_BATCHING = false;
let _BATCHED: Message[] = [];
export async function batchMessages(func: () => Promise<void>): Promise<void> {
  if (IS_BATCHING) {
    await func();
    return;
  }

  IS_BATCHING = true;
  let batched: Message[] = [];

  try {
    await func();
  } catch (e) {
    void errorHandler(e);
    throw e;
  } finally {
    IS_BATCHING = false;
    batched = _BATCHED;
    _BATCHED = [];
  }

  if (batched.length > 0) {
    await _sendMessages(batched);
  }
}

export async function sendMessages(messages: Message[]) {
  if (IS_BATCHING) {
    _BATCHED = _BATCHED.concat(messages);
  } else {
    return _sendMessages(messages);
  }
}

export function getMessagesSince(since: string): Message[] {
  return db.runQuery(
    'SELECT timestamp, dataset, row, column, value FROM messages_crdt WHERE timestamp > ?',
    [since],
    true,
  );
}

export function clearFullSyncTimeout(): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
    syncTimeout = null;
  }
}

let syncTimeout = null;
export function scheduleFullSync(): Promise<
  { messages: Message[] } | { error: unknown }
> {
  clearFullSyncTimeout();

  if (checkSyncingMode('enabled') && !checkSyncingMode('offline')) {
    if (process.env.NODE_ENV === 'test') {
      return fullSync().then(res => {
        if (isError(res)) {
          throw res.error;
        }
        return res;
      });
    } else {
      syncTimeout = setTimeout(fullSync, FULL_SYNC_DELAY);
    }
  }
}

function getTablesFromMessages(messages: Message[]): string[] {
  return messages.reduce((acc, message) => {
    const dataset =
      message.dataset === 'schedules_next_date' ? 'schedules' : message.dataset;

    if (!acc.includes(dataset)) {
      acc.push(dataset);
    }
    return acc;
  }, []);
}

// This is different than `fullSync` because it waits for the
// spreadsheet to finish any processing. This is useful if we want to
// perform a full sync and wait for everything to finish, usually if
// you're doing an initial sync before working with a file.
export async function initialFullSync(): Promise<{
  error?: { message: string; reason: string; meta: unknown };
}> {
  const result = await fullSync();
  if (isError(result)) {
    // Make sure to wait for anything in the spreadsheet to process
    await sheet.waitOnSpreadsheet();
    return result;
  }
  return {};
}

export const fullSync = once(async function (): Promise<
  | { messages: Message[] }
  | { error: { message: string; reason: string; meta: unknown } }
> {
  app.events.emit('sync', { type: 'start' });
  let messages;

  try {
    messages = await _fullSync(null, 0, null);
  } catch (e) {
    logger.log(e);

    if (e instanceof SyncError) {
      if (e.reason === 'out-of-sync') {
        captureException(e);

        app.events.emit('sync', {
          type: 'error',
          subtype: 'out-of-sync',
          meta: e.meta,
        });
      } else if (e.reason === 'invalid-schema') {
        app.events.emit('sync', {
          type: 'error',
          subtype: 'invalid-schema',
          meta: e.meta,
        });
      } else if (
        e.reason === 'decrypt-failure' ||
        e.reason === 'encrypt-failure'
      ) {
        app.events.emit('sync', {
          type: 'error',
          subtype: e.reason,
          meta: e.meta,
        });
      } else if (e.reason === 'clock-drift') {
        app.events.emit('sync', {
          type: 'error',
          subtype: 'clock-drift',
          meta: e.meta,
        });
      } else {
        app.events.emit('sync', { type: 'error', meta: e.meta });
      }
    } else if (e instanceof PostError) {
      logger.log(e);
      if (e.reason === 'unauthorized') {
        app.events.emit('sync', { type: 'unauthorized' });

        // Set the user into read-only mode
        void asyncStorage.setItem('readOnly', 'true');
      } else if (e.reason === 'network-failure') {
        app.events.emit('sync', { type: 'error', subtype: 'network' });
      } else {
        app.events.emit('sync', { type: 'error', subtype: e.reason });
      }
    } else {
      captureException(e);
      // TODO: Send the message to the client and allow them to expand & view it
      app.events.emit('sync', { type: 'error' });
    }

    return { error: { message: e.message, reason: e.reason, meta: e.meta } };
  }

  const tables = getTablesFromMessages(messages);

  app.events.emit('sync', {
    type: 'success',
    tables,
    syncDisabled: checkSyncingMode('disabled'),
  });
  return { messages };
});

async function _fullSync(
  sinceTimestamp: string,
  count: number,
  prevDiffTime: number,
): Promise<Message[]> {
  const {
    id: currentId,
    cloudFileId,
    groupId,
    lastSyncedTimestamp,
  } = prefs.getPrefs() || {};

  clearFullSyncTimeout();

  if (
    checkSyncingMode('disabled') ||
    checkSyncingMode('offline') ||
    !currentId
  ) {
    return [];
  }

  // Snapshot the point at which we are currently syncing
  const currentTime = getClock().timestamp.toString();

  const since =
    sinceTimestamp ||
    lastSyncedTimestamp ||
    // Default to 5 minutes ago
    new Timestamp(Date.now() - 5 * 60 * 1000, 0, '0').toString();

  const messages = getMessagesSince(since);

  const userToken = await asyncStorage.getItem('user-token');

  logger.info(
    'Syncing since',
    since,
    messages.length,
    '(attempt: ' + count + ')',
  );

  const buffer = await encoder.encode(groupId, cloudFileId, since, messages);

  // TODO: There a limit on how many messages we can send because of
  // the payload size. Right now it's at 20MB on the server. We should
  // check the worst case here and make multiple requests if it's
  // really large.
  const resBuffer = await postBinary(
    getServer().SYNC_SERVER + '/sync',
    buffer,
    {
      'X-ACTUAL-TOKEN': userToken,
    },
  );

  // Abort if the file is either no longer loaded, the group id has
  // changed because of a sync reset
  if (!prefs.getPrefs() || prefs.getPrefs().groupId !== groupId) {
    return [];
  }

  const res = await encoder.decode(resBuffer);

  logger.info('Got messages from server', res.messages.length);

  const localTimeChanged = getClock().timestamp.toString() !== currentTime;

  // Apply the new messages
  let receivedMessages: Message[] = [];
  if (res.messages.length > 0) {
    receivedMessages = await receiveMessages(
      res.messages.map(msg => ({
        ...msg,
        value: deserializeValueSafe(msg.value as string),
      })),
    );
  }

  const diffTime = merkle.diff(res.merkle, getClock().merkle);

  if (diffTime !== null) {
    // This is a bit wonky, but we loop until we are in sync with the
    // server. While syncing, either the client or server could change
    // out from under us, so it might take a couple passes to
    // completely sync up. This is a check that stops the loop in case
    // we are corrupted and can't sync up. We try 10 times if we keep
    // getting the same diff time, and add a upper limit of 300 no
    // matter what (just to stop this from ever being an infinite
    // loop).
    //
    // It's slightly possible for the user to add more messages while we
    // are in `receiveMessages`, but `localTimeChanged` would still be
    // false. In that case, we don't reset the counter but it should be
    // very unlikely that this happens enough to hit the loop limit.

    if ((count >= 10 && diffTime === prevDiffTime) || count >= 100) {
      logger.info('SENT -------');
      logger.info(JSON.stringify(messages));
      logger.info('RECEIVED -------');
      logger.info(JSON.stringify(res.messages));

      const rebuiltMerkle = rebuildMerkleHash();

      logger.log(
        count,
        'messages:',
        messages.length,
        messages.length > 0 ? messages[0] : null,
        'res.messages:',
        res.messages.length,
        res.messages.length > 0 ? res.messages[0] : null,
        'clientId',
        getClock().timestamp.node(),
        'groupId',
        groupId,
        'diffTime:',
        diffTime,
        diffTime === prevDiffTime,
        'local clock:',
        getClock().timestamp.toString(),
        getClock().merkle.hash,
        'rebuilt hash:',
        rebuiltMerkle.numMessages,
        rebuiltMerkle.trie.hash,
        'server hash:',
        res.merkle.hash,
        'localTimeChanged:',
        localTimeChanged,
      );

      if (rebuiltMerkle.trie.hash === res.merkle.hash) {
        // Rebuilding the merkle worked... but why?
        const clocks = await db.all<db.DbClockMessage>(
          'SELECT * FROM messages_clock',
        );
        if (clocks.length !== 1) {
          logger.log('Bad number of clocks:', clocks.length);
        }
        const hash = deserializeClock(clocks[0].clock).merkle.hash;
        logger.log('Merkle hash in db:', hash);
      }

      throw new SyncError('out-of-sync');
    }

    receivedMessages = receivedMessages.concat(
      await _fullSync(
        new Timestamp(diffTime, 0, '0').toString(),
        // If something local changed while we were syncing, always
        // reset, token the counter. We never want to think syncing failed
        // because we tried to syncing many times and couldn't sync,
        // but it was because the user kept changing stuff in the
        // middle of syncing.
        localTimeChanged ? 0 : count + 1,
        diffTime,
      ),
    );
  } else {
    // All synced up, store the current time as a simple optimization for the next sync
    const requiresUpdate =
      getClock().timestamp.toString() !== lastSyncedTimestamp;

    if (requiresUpdate) {
      await prefs.savePrefs({
        lastSyncedTimestamp: getClock().timestamp.toString(),
      });
    }
  }

  return receivedMessages;
}
