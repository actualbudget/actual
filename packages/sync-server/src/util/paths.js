import { join, resolve } from 'node:path';

import { config } from '../load-config.js';

/** @param {string} fileId */
export function getPathForUserFile(fileId) {
  return join(resolve(config.get('userFiles')), `file-${fileId}.blob`);
}

/** @param {string} groupId */
export function getPathForGroupFile(groupId) {
  return join(resolve(config.get('userFiles')), `group-${groupId}.sqlite`);
}
