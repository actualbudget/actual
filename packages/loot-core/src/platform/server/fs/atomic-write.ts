// @ts-strict-ignore
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { logger } from '#platform/server/log';
import { retry as promiseRetry } from '#shared/retry';

// Follows symlinks so a write lands on the real underlying file/directory
// instead of replacing the symlink itself.
export async function resolveWriteTarget(filepath: string): Promise<string> {
  try {
    return await fs.promises.realpath(filepath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  const realDir = await fs.promises.realpath(path.dirname(filepath));
  return path.join(realDir, path.basename(filepath));
}

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
  return promiseRetry<T>(async (retry, attempt) => {
    try {
      const result = await op();
      if (attempt > 1) {
        logger.info(
          `Successfully recovered from file lock. It took ${attempt} retries`,
        );
      }
      return result;
    } catch (err) {
      logger.error(
        `${describe(attempt)}. Something is locking the file - potentially a virus scanner or backup software.`,
      );
      retry(err);
      throw err;
    }
  }, retryOptions);
}

// Carries the previous file's permission mode over to the replacement, since
// a fresh write would otherwise get the process's default mode. A no-op for
// a brand-new file, and for platforms (Windows) where chmod doesn't carry
// meaningful permission bits.
async function preserveMode(tmpPath: string, target: string): Promise<void> {
  try {
    const { mode } = await fs.promises.stat(target);
    await fs.promises.chmod(tmpPath, mode);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }
}

// Temp files this process is currently writing. Assumes a single process owns
// the data directory, so any other matching temp file is a crash leftover.
const inFlightTempPaths = new Set<string>();

// Removes temp files left behind by a previous write to this exact target
// that never got cleaned up - e.g. the process was killed before the catch
// block's own cleanup ran. Skips this process's own in-flight writes.
async function sweepOrphanedTempFiles(target: string): Promise<void> {
  const dir = path.dirname(target);
  const prefix = `${path.basename(target)}.`;

  let entries: string[];
  try {
    entries = await fs.promises.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw err;
  }

  await Promise.all(
    entries
      .filter(name => name.startsWith(prefix) && name.endsWith('.tmp'))
      .map(name => path.join(dir, name))
      .filter(tmpPath => !inFlightTempPaths.has(tmpPath))
      .map(tmpPath =>
        fs.promises.rm(tmpPath, { force: true }).catch(() => undefined),
      ),
  );
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
  const target = await resolveWriteTarget(filepath);
  const tmpPath = `${target}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;

  inFlightTempPaths.add(tmpPath);
  await sweepOrphanedTempFiles(target);

  try {
    await withLockRetry(
      () => fs.promises.writeFile(tmpPath, contents, 'utf8'),
      attempt => `Failed to write to ${tmpPath}. Attempted ${attempt} times`,
    );

    await preserveMode(tmpPath, target);

    await withLockRetry(
      () => fs.promises.rename(tmpPath, target),
      attempt =>
        `Failed to rename ${tmpPath} to ${target}. Attempted ${attempt} times`,
    );
  } catch (err) {
    logger.error(`Unable to recover from file lock on file ${target}`);
    await fs.promises.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  } finally {
    inFlightTempPaths.delete(tmpPath);
  }
}
