import fs from 'node:fs/promises';
import path, { resolve } from 'node:path';

import { config } from '#load-config';
import * as simpleSync from '#sync-simple';
import { getPathForUserFile } from '#util/paths';

import type { BlobStore, MigrationStateStore, SyncStore } from './types';

export const syncStore: SyncStore = {
  async sync(messages, since, groupId) {
    return simpleSync.sync(messages, since, groupId);
  },
  async deleteGroup(groupId) {
    await simpleSync.deleteGroup(groupId);
  },
};

export const blobStore: BlobStore = {
  async write(fileId, data) {
    await fs.writeFile(getPathForUserFile(fileId), data);
  },
  async send(fileId, res) {
    const filePath = getPathForUserFile(fileId);

    if (!filePath.startsWith(resolve(config.get('userFiles')))) {
      //Ensure the user doesn't try to access files outside of the user files directory
      res.status(403).send('Access denied');
      return;
    }

    res.sendFile(filePath, { dotfiles: 'allow' });
  },
};

export function getMigrationStateStore(): MigrationStateStore {
  return `${path.join(config.get('dataDir'), '.migrate')}${config.get('mode') === 'test' ? '-test' : ''}`;
}
