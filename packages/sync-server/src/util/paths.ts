import fs from 'node:fs/promises';
import { join, resolve } from 'node:path';

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
  return join(resolve(config.get('userFiles')), `file-${fileId}.blob`);
}

export function getPathForGroupFile(groupId: GroupId) {
  return join(resolve(config.get('userFiles')), `group-${groupId}.sqlite`);
}

// Carries the previous file's permission mode over to the replacement, since
// a fresh write would otherwise get the process's default mode. Best-effort:
// some filesystems (network shares, restricted containers) refuse chmod, and
// losing the mode must not fail the upload.
export async function preserveMode(
  tmpPath: string,
  target: string,
): Promise<void> {
  try {
    const { mode } = await fs.stat(target);
    await fs.chmod(tmpPath, mode);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn(`Could not preserve file mode for ${target}`, err);
    }
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
