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

  // realpath also fails for a symlink whose target doesn't exist yet; follow
  // it by hand so the write creates that target instead of replacing the link.
  // A symlink loop fails realpath with ELOOP above, so this can't recurse forever.
  const linkTarget = await readSymlink(filepath);
  if (linkTarget !== null) {
    return resolveWriteTarget(path.resolve(path.dirname(filepath), linkTarget));
  }

  const realDir = await fs.promises.realpath(path.dirname(filepath));
  return path.join(realDir, path.basename(filepath));
}

async function readSymlink(filepath: string): Promise<string | null> {
  try {
    return await fs.promises.readlink(filepath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // ENOENT: nothing at this path. EINVAL: it exists but isn't a symlink.
    if (code === 'ENOENT' || code === 'EINVAL') {
      return null;
    }
    throw err;
  }
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

// The existing file's permission bits, so the replacement can keep them (a
// fresh file would otherwise get the process's default mode). Undefined when
// there is no existing file, or its mode can't be read.
async function readMode(target: string): Promise<number | undefined> {
  try {
    const { mode } = await fs.promises.stat(target);
    return mode & 0o7777;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(`Could not read file mode for ${target}`, err);
    }
    return undefined;
  }
}

// The temp file is created with `mode` already, but the umask can strip bits
// at creation, so set it exactly afterwards. Best-effort: some filesystems
// (network shares, restricted containers) refuse chmod, and losing the mode
// must not fail the write itself.
async function applyMode(
  tmpPath: string,
  mode: number | undefined,
  target: string,
): Promise<void> {
  if (mode === undefined) {
    return;
  }
  try {
    await fs.promises.chmod(tmpPath, mode);
  } catch (err) {
    logger.warn(`Could not preserve file mode for ${target}`, err);
  }
}

// Matches only the temp names atomicWriteFile creates:
// `<name>.<pid>.<8 hex chars>.tmp`.
const TEMP_FILE_PATTERN = /\.\d+\.[0-9a-f]{8}\.tmp$/;

// Assumes a single process owns the data directory: any matching temp file
// that isn't one of this process's in-flight writes is a crash leftover from
// a previous run, so each directory only needs sweeping once per run.
const inFlightTempPaths = new Set<string>();
const sweptDirectories = new Set<string>();

// Best-effort: failing to clean up leftovers must not fail the write itself.
async function sweepOrphanedTempFiles(dir: string): Promise<void> {
  if (sweptDirectories.has(dir)) {
    return;
  }
  sweptDirectories.add(dir);

  try {
    const entries = await fs.promises.readdir(dir);
    await Promise.all(
      entries
        .filter(name => TEMP_FILE_PATTERN.test(name))
        .map(name => path.join(dir, name))
        .filter(tmpPath => !inFlightTempPaths.has(tmpPath))
        .map(tmpPath => fs.promises.rm(tmpPath, { force: true })),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(`Could not clean up leftover temp files in ${dir}`, err);
    }
  }
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
  await sweepOrphanedTempFiles(path.dirname(target));

  try {
    // Create the temp file with the original's mode from the start, so the
    // new contents are never more readable than the file they replace.
    const mode = await readMode(target);

    // flush: fsync before the rename, so after a power loss the target holds
    // either the old or the new contents, not a renamed but unwritten file.
    await withLockRetry(
      () =>
        fs.promises.writeFile(tmpPath, contents, {
          encoding: 'utf8',
          flush: true,
          mode,
        }),
      attempt => `Failed to write to ${tmpPath}. Attempted ${attempt} times`,
    );

    await applyMode(tmpPath, mode, target);

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
