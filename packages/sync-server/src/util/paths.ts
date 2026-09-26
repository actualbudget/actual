import { randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';

import { config } from '#load-config';

import type { BrandedId } from './types';

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export type FileId = BrandedId<'file'>;
export type GroupId = BrandedId<'group'>;

export function isValidFileId(id: string): id is FileId {
  return ID_REGEX.test(id);
}

export function isValidGroupId(id: string): id is GroupId {
  return ID_REGEX.test(id);
}

export function getPathForUserFile(fileId: FileId) {
  const userFilesDir = resolve(config.get('userFiles'));
  const filePath = resolve(userFilesDir, `file-${fileId}.blob`);
  // isValidFileId already rules out traversal; this makes the containment
  // explicit where the path is built, so the guarantee doesn't depend on
  // every caller having validated the id first.
  if (!filePath.startsWith(userFilesDir + sep)) {
    throw new Error('Invalid file id');
  }
  return filePath;
}

export function getPathForGroupFile(groupId: GroupId) {
  return join(resolve(config.get('userFiles')), `group-${groupId}.sqlite`);
}

// The existing file's permission bits, so the replacement can keep them (a
// fresh file would otherwise get the process's default mode). Undefined when
// there is no existing file, or its mode can't be read.
async function readMode(target: string): Promise<number | undefined> {
  try {
    const { mode } = await fs.stat(target);
    return mode & 0o7777;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Could not read file mode for ${target}`, err);
    }
    return undefined;
  }
}

// The temp file is created with `mode` already, but the umask can strip bits
// at creation, so set it exactly afterwards. Best-effort: some filesystems
// (network shares, restricted containers) refuse chmod, and losing the mode
// must not fail the upload.
async function applyMode(
  tmpPath: string,
  mode: number | undefined,
  target: string,
): Promise<void> {
  if (mode === undefined) {
    return;
  }
  try {
    await fs.chmod(tmpPath, mode);
  } catch (err) {
    console.warn(`Could not preserve file mode for ${target}`, err);
  }
}

// Matches only the temp names /upload-user-file creates:
// `<name>.<pid>-<8 hex chars>.tmp`.
const TEMP_FILE_PATTERN = /\.\d+-[0-9a-f]{8}\.tmp$/;

const sweptDirectories = new Set<string>();

// Removes temp files left behind by a crashed upload. Assumes a single
// process owns the data directory: any matching temp file not in `inFlight`
// (this process's own in-progress uploads) is a leftover from a previous run,
// so each directory only needs sweeping once per run. Best-effort: failing to
// clean up must not fail the upload.
export async function sweepOrphanedTempFiles(
  dir: string,
  inFlight: ReadonlySet<string>,
): Promise<void> {
  if (sweptDirectories.has(dir)) {
    return;
  }
  sweptDirectories.add(dir);

  try {
    const entries = await fs.readdir(dir);
    await Promise.all(
      entries
        .filter(name => TEMP_FILE_PATTERN.test(name))
        .map(name => join(dir, name))
        .filter(tmpPath => !inFlight.has(tmpPath))
        .map(tmpPath => fs.rm(tmpPath, { force: true })),
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Could not clean up leftover temp files in ${dir}`, err);
    }
  }
}

// Follows symlinks so a write lands on the real underlying file instead of
// replacing the symlink itself.
export async function resolveWriteTarget(filepath: string): Promise<string> {
  try {
    return await fs.realpath(filepath);
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
    return resolveWriteTarget(resolve(dirname(filepath), linkTarget));
  }

  const realDir = await fs.realpath(dirname(filepath));
  return join(realDir, basename(filepath));
}

async function readSymlink(filepath: string): Promise<string | null> {
  try {
    return await fs.readlink(filepath);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    // ENOENT: nothing at this path. EINVAL: it exists but isn't a symlink.
    if (code === 'ENOENT' || code === 'EINVAL') {
      return null;
    }
    throw err;
  }
}

const inFlightTempPaths = new Set<string>();

// Replaces the file at `filepath` atomically: the contents are written to a
// temp file next to the real target (following symlinks), then renamed over
// it. A concurrent reader (a backup tool, a download) always sees either the
// complete old file or the complete new one, never a torn write.
export async function atomicWriteUserFile(
  filepath: string,
  contents: NodeJS.ArrayBufferView | string,
): Promise<void> {
  const target = await resolveWriteTarget(filepath);
  const tmpPath = `${target}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;

  inFlightTempPaths.add(tmpPath);
  try {
    await sweepOrphanedTempFiles(dirname(target), inFlightTempPaths);
    // Create the temp file with the original's mode from the start, so the
    // new contents are never more readable than the file they replace.
    const mode = await readMode(target);
    // flush: fsync before the rename, so after a power loss the target holds
    // either the old or the new contents, not a renamed but unwritten file.
    await fs.writeFile(tmpPath, contents, { flush: true, mode });
    await applyMode(tmpPath, mode, target);
    await fs.rename(tmpPath, target);
  } catch (err) {
    await fs.rm(tmpPath, { force: true }).catch(() => undefined);
    throw err;
  } finally {
    inFlightTempPaths.delete(tmpPath);
  }
}
