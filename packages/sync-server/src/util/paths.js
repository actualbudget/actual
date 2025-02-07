import { join } from 'node:path';
import config from '../load-config.js';

/** @param {string} fileId */
export function getPathForUserFile(fileId) {
  return join(config.userFiles, `file-${fileId}.blob`);
}

/** @param {string} groupId */
export function getPathForGroupFile(groupId) {
  return join(config.userFiles, `group-${groupId}.sqlite`);
}
