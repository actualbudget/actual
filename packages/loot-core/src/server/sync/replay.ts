import { logger } from '#platform/server/log';
import * as db from '#server/db';

import {
  deserializeValue,
  isMissingSchemaError,
  notifyDeferredMessages,
  resetDeferredMessagesNotification,
} from './index';

// Applies sync messages that were deferred because they referenced
// tables/columns this client didn't have yet (sent by a newer version of
// the app; see `deferMessage` in ./index.ts). Called on budget load right
// after migrations run. Messages that still reference unknown schema stay
// pending for a future upgrade, and re-trigger the update-required
// notification.
//
// Applying in timestamp order gives last-write-wins per cell. This is
// safe because nothing else can have written those cells: while the
// column/table was missing, every message for it was deferred, and replay
// runs before syncing or local mutations start.
export function replayPendingMessages(): void {
  resetDeferredMessagesNotification();

  const pending = db.runQuery<db.DbPendingMessage>(
    'SELECT * FROM messages_pending ORDER BY timestamp',
    [],
    true,
  );
  if (pending.length === 0) {
    return;
  }

  let appliedCount = 0;
  db.transaction(() => {
    for (const msg of pending) {
      const value = deserializeValue(msg.value);

      try {
        // The same per-cell write as `apply` in ./index.ts, as a single
        // branch-free upsert
        db.runQuery(
          db.cache(
            `INSERT INTO ${msg.dataset} (id, ${msg.column}) VALUES (?, ?)
               ON CONFLICT(id) DO UPDATE SET ${msg.column} = excluded.${msg.column}`,
          ),
          [msg.row, value],
        );
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
  if (appliedCount < pending.length) {
    notifyDeferredMessages();
  }
}
