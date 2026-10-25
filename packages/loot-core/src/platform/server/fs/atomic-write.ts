import * as fs from 'fs';

import { logger } from '#platform/server/log';
import { retry as promiseRetry } from '#shared/retry';

let tempFileCounter = 0;

// Follows a symlinked file so the rename replaces its target, not the link.
async function resolveTarget(filepath: string): Promise<string> {
  try {
    return await fs.promises.realpath(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return filepath;
    }
    throw err;
  }
}

// Writes to a temp file next to the target and renames it into place, so the
// target always holds either the old or the new contents in full.
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
          await fs.promises.writeFile(tmpPath, contents, {
            encoding: 'utf8',
            flush: true,
            mode,
          });
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
