import * as fs from 'fs';
import * as path from 'path';

import { logger } from '#platform/server/log';
import { retry as promiseRetry } from '#shared/retry';

let tempFileCounter = 0;

// Follows symlinks, including dangling ones, so the rename replaces the
// link's target rather than the link.
async function resolveTarget(filepath: string): Promise<string> {
  try {
    return await fs.promises.realpath(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
  const link = await fs.promises.readlink(filepath).catch(() => null);
  if (link === null) {
    return filepath;
  }
  // Not path.resolve, which collapses `..` before symlinked directories are
  // followed.
  return resolveTarget(
    path.isAbsolute(link) ? link : path.dirname(filepath) + path.sep + link,
  );
}

// Writes a temp file and renames it over the target, so a write that fails or
// is killed partway leaves the original file intact.
export async function atomicWriteFile(
  filepath: string,
  contents: string | NodeJS.ArrayBufferView,
): Promise<void> {
  const target = await resolveTarget(filepath);
  const tmpPath = `${target}.${process.pid}.${tempFileCounter++}.tmp`;
  const mode = await fs.promises.stat(target).then(
    stats => stats.mode & 0o777,
    () => undefined,
  );

  try {
    await promiseRetry(
      async (retry, attempt) => {
        try {
          await fs.promises.writeFile(tmpPath, contents, { flush: true, mode });
          if (mode !== undefined) {
            // Restore bits the umask stripped. Best-effort, as some
            // filesystems refuse chmod.
            await fs.promises.chmod(tmpPath, mode).catch(() => undefined);
          }
          await fs.promises.rename(tmpPath, target);
          if (attempt > 1) {
            logger.info(
              `Successfully recovered from file lock. It took ${attempt} retries`,
            );
          }
        } catch (err) {
          logger.error(
            `Failed to write to ${filepath}. Attempted ${attempt} times. Something is locking the file - potentially a virus scanner or backup software.`,
          );
          retry(err);
        }
      },
      {
        retries: 20,
        minTimeout: 100,
        maxTimeout: 500,
        factor: 1.5,
      },
    );
  } catch (err) {
    logger.error(`Unable to recover from file lock on file ${filepath}`);
    await fs.promises.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}
