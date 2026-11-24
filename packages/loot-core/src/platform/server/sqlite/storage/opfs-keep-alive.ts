import { logger } from '#platform/server/log';

// Chromium keeps an index of every site's private file system and closes it
// after ten minutes without file activity. In a private window the index
// lives in memory, yet reopening it checks for its folder on disk
// (`File System/Origins` in the profile), which is only there when a normal
// window has ever used this storage. Without it the site looks new: access
// handles that are open stop working, and the next
// `navigator.storage.getDirectory()` deletes the site's files as leftovers,
// while IndexedDB carries on. A lookup counts as activity, so one every few
// minutes keeps the index open for as long as this worker runs. Nothing
// helps once the tab is closed or frozen for longer than that: then the
// lookup fails, and all that is left is to say so.

const KEEP_ALIVE_INTERVAL_MS = 3 * 60 * 1000;

type DirectoryLookup = {
  getDirectoryHandle(name: string): Promise<unknown>;
};

export type OpfsKeepAliveOptions = {
  // A directory that is known to exist, looked up on every tick
  directoryName: string;
  // The browser dropped the private file system under this worker
  onLost: () => void;
  getRoot?: () => Promise<DirectoryLookup>;
  intervalMs?: number;
};

export type OpfsKeepAlive = {
  // Looks now rather than at the next tick, and resolves whether the
  // private file system is still there
  check(): Promise<boolean>;
  stop(): void;
};

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'NotFoundError'
  );
}

// Call while the index is known to be live, straight after the storage
// probe: the root is taken once here and every later lookup goes through
// it, never through `getDirectory()` again, which is the call that deletes
// the files once the index has gone.
export async function startOpfsKeepAlive({
  directoryName,
  onLost,
  getRoot = () => navigator.storage.getDirectory(),
  intervalMs = KEEP_ALIVE_INTERVAL_MS,
}: OpfsKeepAliveOptions): Promise<OpfsKeepAlive> {
  let root: DirectoryLookup;
  try {
    root = await getRoot();
  } catch (error) {
    logger.warn('sqlite storage: no keep-alive for OPFS', error);
    return { check: async () => true, stop: () => undefined };
  }

  let isLost = false;

  async function check(): Promise<boolean> {
    if (isLost) {
      return false;
    }
    try {
      await root.getDirectoryHandle(directoryName);
      return true;
    } catch (error) {
      if (!isNotFound(error)) {
        // Not the sign of a dropped index, so nothing to conclude
        logger.warn('sqlite storage: OPFS keep-alive lookup failed', error);
        return true;
      }
      if (!isLost) {
        isLost = true;
        stop();
        logger.error(
          'sqlite storage: the browser discarded the private file system',
        );
        onLost();
      }
      return false;
    }
  }

  const timer = setInterval(() => void check(), intervalMs);

  function stop() {
    clearInterval(timer);
  }

  return { check, stop };
}
