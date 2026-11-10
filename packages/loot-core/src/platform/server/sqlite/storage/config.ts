import { logger } from '#platform/server/log';
import { getSqlite3 } from '#platform/server/sqlite/wasm';

// `preserveOnInitFailure` arrived in sqlite-wasm 3.54; without it a failed
// pool install deletes the pool directory, which is never acceptable for
// user data
export const MIN_SQLITE_VERSION = 3054000;
// The parent of the pool directories (see POOL_ROOT in opfs-sahpool.ts),
// which the probe below leaves behind
export const PROBE_DIRECTORY = 'actual';

// Whether this worker can use OPFS sync access handles: present (dedicated
// worker, secure context, Chrome 108, Firefox 111, Safari 16.4) and usable
// (Safari private browsing throws from `getDirectory`), on a sqlite build
// new enough to keep the pool directory when an install fails.
export async function detectOpfsSyncAccess(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.storage?.getDirectory !== 'function'
  ) {
    return false;
  }
  if (getSqlite3().version.libVersionNumber < MIN_SQLITE_VERSION) {
    logger.warn('sqlite storage: OPFS disabled, sqlite-wasm older than 3.54');
    return false;
  }
  try {
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(PROBE_DIRECTORY, {
      create: true,
    });
    const probeName = `.probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const file = await directory.getFileHandle(probeName, { create: true });
    try {
      const handle = await file.createSyncAccessHandle();
      handle.close();
      return true;
    } finally {
      await directory.removeEntry(probeName).catch(() => undefined);
    }
  } catch (error) {
    logger.warn('sqlite storage: OPFS unavailable', error);
    return false;
  }
}
