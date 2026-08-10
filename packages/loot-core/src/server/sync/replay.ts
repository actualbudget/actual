import { captureException } from '#platform/exceptions';
import { logger } from '#platform/server/log';
import * as db from '#server/db';
import { isMissingSchemaError } from '#shared/errors';

import { deserializeValue } from './serialization';
import {
  notifyDeferredMessages,
  notifyDroppedMessages,
  quoteSqlId,
  resetDeferredMessagesNotification,
} from './utils';

// SQLite failures that repeat identically on every attempt. Anything
// else non-schema (locked/full/interrupted/storage errors) may be
// transient and aborts the whole replay instead.
const DETERMINISTIC_SQLITE_ERROR =
  /constraint failed|datatype mismatch|cannot store|generated column|string or blob too big|syntax error/i;

type ReplayOutcome =
  | { outcome: 'applied' }
  | { outcome: 'newer-version' }
  | { outcome: 'failed'; error: Error };

// Deletes pending rows superseded by a newer acknowledged write in the
// crdt log (last write wins per cell — possible because an
// unknown-format value defers even when its column exists). Also used
// by `resetSync` so its discard warning only counts real losses.
export function deleteStalePendingMessages(): void {
  db.runQuery(`
    DELETE FROM messages_pending
      WHERE EXISTS
        (SELECT 1 FROM messages_crdt c
          WHERE c.dataset = messages_pending.dataset
            AND c.row = messages_pending.row
            AND c.column = messages_pending.column
            AND c.timestamp > messages_pending.timestamp)
  `);
}

// Applies sync messages that were deferred because they referenced
// schema (or a value format) this client didn't have yet — see
// `deferMessage` in ./index.ts. Called on budget load right after
// migrations run, only when a sync server is configured. Messages that
// still can't apply stay pending for a future upgrade and re-trigger
// the update-required notification.
export function replayPendingMessages(): void {
  resetDeferredMessagesNotification();

  let appliedCount = 0;
  let newerVersionCount = 0;
  let failedCount = 0;

  const replay = () => {
    deleteStalePendingMessages();

    // Timestamp order gives last-write-wins per cell
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
        // A value format from an even newer version; decodes after the
        // user updates
        return { outcome: 'newer-version' };
      }
      try {
        // The same per-cell write as `apply` in ./index.ts. Not an
        // upsert: SQLite checks row-level CHECK constraints against the
        // INSERT candidate row (sibling columns NULL) before ON
        // CONFLICT fires, so an existing row must take the UPDATE path.
        const updated = Number(
          db.runQuery(
            db.cache(
              `UPDATE ${quoteSqlId(msg.dataset)} SET ${quoteSqlId(msg.column)} = ? WHERE id = ?`,
            ),
            [value, msg.row],
          ).changes,
        );
        if (updated === 0) {
          db.runQuery(
            db.cache(
              `INSERT INTO ${quoteSqlId(msg.dataset)} (id, ${quoteSqlId(msg.column)}) VALUES (?, ?)`,
            ),
            [msg.row, value],
          );
        }
        return { outcome: 'applied' };
      } catch (e) {
        if (isMissingSchemaError(e)) {
          // Still targets schema from an even newer version
          return { outcome: 'newer-version' };
        }
        const error = e instanceof Error ? e : new Error(String(e));
        if (!DETERMINISTIC_SQLITE_ERROR.test(error.message)) {
          // Possibly transient — and errors like disk-full force SQLite
          // to roll back the enclosing transaction, so continuing would
          // run in autocommit. Abort; everything stays pending.
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

    function processPass(
      msgs: db.DbPendingMessage[],
    ): Array<{ msg: db.DbPendingMessage; error: Error }> {
      const failed: Array<{ msg: db.DbPendingMessage; error: Error }> = [];
      for (const msg of msgs) {
        const result = applyOne(msg);
        if (result.outcome === 'applied') {
          appliedCount++;
          deletePending(msg);
        } else if (result.outcome === 'newer-version') {
          newerVersionCount++;
        } else {
          failed.push({ msg, error: result.error });
        }
      }
      return failed;
    }

    // Retry while passes make progress: a row-level constraint can need
    // later cells to fill the row first, including through dependency
    // chains. Terminates because each retained pass strictly shrinks
    // the failure list.
    let failed = processPass(pending);
    while (failed.length > 0) {
      const retried = processPass(failed.map(failure => failure.msg));
      if (retried.length === failed.length) {
        // No progress: these repeat identically on every load, so drop
        // them. The values stay in messages_crdt history, but this
        // device now diverges for those cells.
        for (const { msg, error } of retried) {
          captureException(error);
          failedCount++;
          deletePending(msg);
        }
        break;
      }
      failed = retried;
    }

    if (appliedCount > 0) {
      // The values were written outside the normal sync pipeline, so
      // force the spreadsheet cache to recompute
      db.runQuery('DELETE FROM kvcache_key');
    }
  };

  try {
    db.transaction(replay);
  } catch (e) {
    // Possibly-transient abort: nothing was dropped, everything retries
    // on the next load — telemetry only, no user notification
    captureException(e instanceof Error ? e : new Error(String(e)));
    return;
  }

  if (appliedCount > 0) {
    logger.info(
      `Applied ${appliedCount} sync message(s) deferred from a newer version`,
    );
  }
  if (failedCount > 0) {
    notifyDroppedMessages();
  }
  if (newerVersionCount > 0) {
    notifyDeferredMessages();
  }
}
