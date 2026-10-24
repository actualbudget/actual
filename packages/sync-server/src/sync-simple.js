import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';

import { openDatabase } from './db';
import { messagesSql, syncGroup } from './sync-core';
import { getPathForGroupFile } from './util/paths';

// Node storage for sync groups: one SQLite file per group in `userFiles`.

function getGroupDb(groupId) {
  const path = getPathForGroupFile(groupId);
  const needsInit = !existsSync(path);

  const db = openDatabase(path);

  if (needsInit) {
    db.exec(messagesSql);
  }

  return db;
}

export function sync(messages, since, groupId) {
  const db = getGroupDb(groupId);
  try {
    return syncGroup(db, messages, since);
  } finally {
    db.close();
  }
}

export async function deleteGroup(groupId) {
  await fs.unlink(getPathForGroupFile(groupId));
}
