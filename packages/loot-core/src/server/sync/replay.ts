import { logger } from '#platform/server/log';
import * as db from '#server/db';

import { deserializeValue, isMissingSchemaError } from './index';

// Applies sync messages that were deferred because they referenced
// tables/columns this client didn't have yet (sent by a newer version of
// the app; see `deferMessage` in ./index.ts). Called on budget load right
// after migrations run. Messages that still reference unknown schema stay
// pending for a future upgrade.
//
// Applying in timestamp order gives last-write-wins per cell. This is
// safe because nothing else can have written those cells: while the
// column/table was missing, every message for it was deferred, and replay
// runs before syncing or local mutations start.
//
// Returns the number of messages still pending afterwards, so the
// caller can re-notify the user that an app update is needed.
export function replayPendingMessages(): number {
  const pending = db.runQuery<db.DbPendingMessage>(
    'SELECT * FROM messages_pending ORDER BY timestamp',
    [],
    true,
  );
  if (pending.length === 0) {
    return 0;
  }

  let appliedCount = 0;
  db.transaction(() => {
    for (const msg of pending) {
      const value = deserializeValue(msg.value);

      try {
        const { changes } = db.runQuery(
          db.cache(`UPDATE ${msg.dataset} SET ${msg.column} = ? WHERE id = ?`),
          [value, msg.row],
        );
        if (Number(changes) === 0) {
          db.runQuery(
            db.cache(
              `INSERT INTO ${msg.dataset} (id, ${msg.column}) VALUES (?, ?)`,
            ),
            [msg.row, value],
          );
        }
        db.runQuery(
          db.cache('DELETE FROM messages_pending WHERE timestamp = ?'),
          [msg.timestamp],
        );
        appliedCount++;
      } catch (e) {
        if (!isMissingSchemaError(e)) {
          throw e;
        }
      }
    }

    if (appliedCount > 0) {
      // The replayed values were written outside of the normal sync
      // pipeline, so force the spreadsheet cache to recompute
      db.runQuery('DELETE FROM kvcache_key');
    }
  });

  if (appliedCount > 0) {
    logger.info(
      `Applied ${appliedCount} sync message(s) deferred from a newer version`,
    );
  }
  return pending.length - appliedCount;
}
