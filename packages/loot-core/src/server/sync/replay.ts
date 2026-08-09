import { captureException } from '#platform/exceptions';
import { logger } from '#platform/server/log';
import * as db from '#server/db';
import { isMissingSchemaError } from '#shared/errors';

import {
  notifyDeferredMessages,
  notifyDroppedMessages,
  resetDeferredMessagesNotification,
} from './notifications';
import { deserializeValue } from './serialization';

// SQLite failures that deterministically repeat on every attempt:
// constraint violations and type rejections. Anything else non-schema
// (locked/full/interrupted/browser storage errors) may be transient, so
// it aborts the whole replay — everything stays pending and retries on
// the next load. Substring match: SQLite prefixes these phrases with
// error-specific detail.
const DETERMINISTIC_SQLITE_ERROR =
  /constraint failed|datatype mismatch|cannot store/i;

type ReplayOutcome =
  | { outcome: 'applied' }
  | { outcome: 'newer-version' }
  | { outcome: 'failed'; error: Error };

// Applies sync messages that were deferred because they referenced
// tables/columns this client didn't have yet (sent by a newer version of
// the app; see `deferMessage` in ./index.ts). Called on budget load right
// after migrations run, but only when a sync server is configured (see
// the call site in budgetfiles/app.ts). Messages that still reference
// unknown schema (or use a value format this version can't decode) stay
// pending for a future upgrade, and re-trigger the update-required
// notification.
//
// Applying in timestamp order gives last-write-wins per cell. While a
// column/table was missing, every message for it was deferred, so
// nothing else wrote those cells — but an unknown-format value defers
// even when its column exists, so a newer decodable write may have
// applied through normal sync in the meantime. Pending rows superseded
// by a newer acknowledged write are discarded up front.
// Deletes pending rows whose loss is not user-visible data loss: rows
// superseded by a newer write in the crdt log (last write wins per
// cell), and rows for the legacy spreadsheet_cells dataset — `apply`
// ignores it (see ./index.ts), but builds of this feature from before
// that fix deferred them, and they could otherwise never drain. Also
// used by `resetSync` so its discard warning only counts real losses.
export function deleteStalePendingMessages(): void {
  db.runQuery(`
    DELETE FROM messages_pending
      WHERE dataset = 'spreadsheet_cells'
        OR EXISTS
          (SELECT 1 FROM messages_crdt c
            WHERE c.dataset = messages_pending.dataset
              AND c.row = messages_pending.row
              AND c.column = messages_pending.column
              AND c.timestamp > messages_pending.timestamp)
  `);
}

export function replayPendingMessages(): void {
  resetDeferredMessagesNotification();

  let appliedCount = 0;
  let newerVersionCount = 0;
  let failedCount = 0;

  const replay = () => {
    deleteStalePendingMessages();

    const pending = db.runQuery<db.DbPendingMessage>(
      'SELECT * FROM messages_pending ORDER BY timestamp',
      [],
      true,
    );
    if (pending.length === 0) {
      return;
    }

    function applyOne(msg: db.DbPendingMessage): ReplayOutcome {
      let value;
      try {
        value = deserializeValue(msg.value);
      } catch {
        // A serialized-value format from an even newer version; it
        // decodes once the user updates
        return { outcome: 'newer-version' };
      }
      try {
        // The same per-cell write as `apply` in ./index.ts. A plain
        // `ON CONFLICT DO UPDATE` upsert won't do here: SQLite checks
        // row-level CHECK constraints against the INSERT candidate row
        // (sibling columns NULL) before the conflict clause fires, so
        // an existing row must take the UPDATE path for constraints
        // involving sibling columns to see the merged row.
        const exists =
          db.runQuery(
            db.cache(`SELECT 1 FROM ${msg.dataset} WHERE id = ? LIMIT 1`),
            [msg.row],
            true,
          ).length > 0;
        db.runQuery(
          db.cache(
            exists
              ? `UPDATE ${msg.dataset} SET ${msg.column} = ? WHERE id = ?`
              : `INSERT INTO ${msg.dataset} (id, ${msg.column}) VALUES (?, ?)`,
          ),
          exists ? [value, msg.row] : [msg.row, value],
        );
        return { outcome: 'applied' };
      } catch (e) {
        if (isMissingSchemaError(e)) {
          // Still targets schema from an even newer version — keep it
          // pending for the next upgrade
          return { outcome: 'newer-version' };
        }
        const error = e instanceof Error ? e : new Error(String(e));
        if (!DETERMINISTIC_SQLITE_ERROR.test(error.message)) {
          // Possibly transient — and errors like disk-full force SQLite
          // to roll back the enclosing transaction, so continuing would
          // run the remaining statements in autocommit. Abort the whole
          // replay: everything stays pending and retries on the next
          // load (reported and notified by the catch around the
          // transaction).
          throw error;
        }
        return { outcome: 'failed', error };
      }
    }

    function deletePending(msg: db.DbPendingMessage) {
      db.runQuery(
        db.cache(
          'DELETE FROM messages_pending WHERE dataset = ? AND row = ? AND column = ?',
        ),
        [msg.dataset, msg.row, msg.column],
      );
    }

    // Applies each message, returning the ones that failed
    // deterministically; with `dropFailed`, those are dropped instead.
    // The value is still recorded in messages_crdt history when that
    // happens, but this device then diverges for the cell (it would
    // otherwise re-fail identically on every load, wedging replay).
    function processPass(
      msgs: db.DbPendingMessage[],
      dropFailed: boolean,
    ): db.DbPendingMessage[] {
      const failed: db.DbPendingMessage[] = [];
      for (const msg of msgs) {
        const result = applyOne(msg);
        if (result.outcome === 'applied') {
          appliedCount++;
          deletePending(msg);
        } else if (result.outcome === 'newer-version') {
          newerVersionCount++;
        } else if (dropFailed) {
          captureException(result.error);
          failedCount++;
          deletePending(msg);
        } else {
          failed.push(msg);
        }
      }
      return failed;
    }

    // First pass in timestamp order, then keep retrying while passes
    // make progress: a row-level constraint (NOT NULL/CHECK involving
    // sibling columns) can fail a cell's INSERT until later pending
    // messages fill the rest of the row, including through dependency
    // chains. Terminates because each retained pass strictly shrinks
    // the failure list (worst case O(n) passes over the per-cell
    // coalesced queue). Only failures surviving a no-progress pass are
    // deterministic for good and get dropped.
    let failed = processPass(pending, false);
    while (failed.length > 0) {
      const retried = processPass(failed, false);
      if (retried.length === failed.length) {
        processPass(retried, true);
        break;
      }
      failed = retried;
    }

    if (appliedCount > 0) {
      // The replayed values were written outside of the normal sync
      // pipeline, so force the spreadsheet cache to recompute
      db.runQuery('DELETE FROM kvcache_key');
    }
  };

  try {
    db.transaction(replay);
  } catch (e) {
    // A possibly-transient error aborted the replay (see `applyOne`);
    // everything stays pending and retries on the next load. Don't stay
    // silent about the other devices' changes not being visible yet.
    captureException(e instanceof Error ? e : new Error(String(e)));
    notifyDroppedMessages();
    return;
  }

  if (appliedCount > 0) {
    logger.info(
      `Applied ${appliedCount} sync message(s) deferred from a newer version`,
    );
  }
  // Dropped messages mean the other device's change is not visible on
  // this one, so say so
  if (failedCount > 0) {
    notifyDroppedMessages();
  }
  if (newerVersionCount > 0) {
    notifyDeferredMessages();
  }
}
