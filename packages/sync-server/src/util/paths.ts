import { join, resolve, sep } from 'node:path';

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
  // isValidFileId already rules out traversal; this keeps the check where the
  // path is built. Filesystem roots already end in sep.
  const prefix = userFilesDir.endsWith(sep) ? userFilesDir : userFilesDir + sep;
  if (!filePath.startsWith(prefix)) {
    throw new Error('Invalid file id');
  }
  return filePath;
}

export function getPathForGroupFile(groupId: GroupId) {
  return join(resolve(config.get('userFiles')), `group-${groupId}.sqlite`);
}
