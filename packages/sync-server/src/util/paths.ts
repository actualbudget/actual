import * as fs from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

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

// Removes temp files left behind by a previous write to this exact target
// that never got cleaned up - e.g. the process was killed before the catch
// block's own cleanup ran. Skips `inFlight` (this process's own in-progress
// writes); assumes a single process owns the data directory, so any other
// matching temp file is a crash leftover.
export async function sweepOrphanedTempFiles(
  target: string,
  inFlight: ReadonlySet<string>,
): Promise<void> {
  const dir = dirname(target);
  const prefix = `${basename(target)}.`;

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw err;
  }

  await Promise.all(
    entries
      .filter(name => name.startsWith(prefix) && name.endsWith('.tmp'))
      .map(name => join(dir, name))
      .filter(tmpPath => !inFlight.has(tmpPath))
      .map(tmpPath => fs.rm(tmpPath, { force: true }).catch(() => undefined)),
  );
}
