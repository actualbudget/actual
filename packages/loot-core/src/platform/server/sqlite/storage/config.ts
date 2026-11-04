import { logger } from '#platform/server/log';
import { getSqlite3 } from '#platform/server/sqlite/wasm';

import { MIN_SQLITE_VERSION } from './opfs-sahpool';

const PROBE_DIRECTORY = 'actual';

// Whether this worker can use OPFS sync access handles: the API has to be
// present (dedicated worker, secure context, Chrome 108, Firefox 111,
// Safari 16.4) and actually usable (Safari private browsing throws from
// `getDirectory`), and the sqlite build must be new enough to keep the
// pool directory when an install fails.
export async function detectOpfsSyncAccess(): Promise<boolean> {
  try {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.storage?.getDirectory !== 'function' ||
      typeof FileSystemFileHandle === 'undefined' ||
      !('createSyncAccessHandle' in FileSystemFileHandle.prototype)
    ) {
      return false;
    }
    if (getSqlite3().version.libVersionNumber < MIN_SQLITE_VERSION) {
      logger.warn('sqlite storage: OPFS disabled, sqlite-wasm older than 3.54');
      return false;
    }
    const root = await navigator.storage.getDirectory();
    const directory = await root.getDirectoryHandle(PROBE_DIRECTORY, {
      create: true,
    });
    const probeName = `.probe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const file = await directory.getFileHandle(probeName, { create: true });
    const handle = await file.createSyncAccessHandle();
    handle.close();
    await directory.removeEntry(probeName);
    return true;
  } catch (error) {
    logger.warn('sqlite storage: OPFS unavailable', error);
    return false;
  }
}
