import { join, resolve } from 'node:path';

import { config } from '#load-config';

import type { BrandedId } from './types';

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

type FileId = BrandedId<'file'>;

export function isValidFileId(id: string): id is FileId {
  return ID_REGEX.test(id);
}

export function getPathForUserFile(fileId: FileId) {
  return join(resolve(config.get('userFiles')), `file-${fileId}.blob`);
}

export function getPathForGroupFile(groupId: FileId) {
  return join(resolve(config.get('userFiles')), `group-${groupId}.sqlite`);
}
