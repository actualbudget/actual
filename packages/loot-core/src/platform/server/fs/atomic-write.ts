// @ts-strict-ignore
import * as crypto from 'crypto';
import * as fs from 'fs';

import { logger } from '#platform/server/log';
import { retry as promiseRetry } from '#shared/retry';

const retryOptions = {
  retries: 20,
  minTimeout: 100,
  maxTimeout: 500,
  factor: 1.5,
};

async function withLockRetry<T>(
  op: () => Promise<T>,
  describe: (attempt: number) => string,
): Promise<T> {
  return promiseRetry(async (retry, attempt) => {
    try {
      const result = await op();
      if (attempt > 1) {
        logger.info(
          `Successfully recovered from file lock. It took ${attempt} retries`,
        );
      }
      return result;
    } catch (err) {
      logger.error(`${describe(attempt)}. Something is locking the file - potentially a virus scanner or backup software.`);
      return retry(err);
    }
  }, retryOptions);
}

// Writes `contents` to `filepath` atomically: the contents are written to a
// temp file in the same directory, then renamed over the target. A
// concurrent reader (another process, a backup tool) always sees either the
// complete old file or the complete new one, never a torn write - even if
// this process is killed mid-write.
export async function atomicWriteFile(
  filepath: string,
  contents: string,
): Promise<void> {
  const tmpPath = `${filepath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;

  try {
    await withLockRetry(
      () => fs.promises.writeFile(tmpPath, contents, 'utf8'),
      attempt => `Failed to write to ${tmpPath}. Attempted ${attempt} times`,
    );

    await withLockRetry(
      () => fs.promises.rename(tmpPath, filepath),
      attempt =>
        `Failed to rename ${tmpPath} to ${filepath}. Attempted ${attempt} times`,
    );
  } catch (err) {
    logger.error(`Unable to recover from file lock on file ${filepath}`);
    await fs.promises.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  }
}
