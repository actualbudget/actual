import { createApp } from '#server/app';

import { repairSync as _repairSync } from './repair';
import { resetSync as _resetSync } from './reset';

import { fullSync, waitForPostSyncWork } from '.';

export type SyncHandlers = {
  sync: typeof sync;
  'sync-reset': typeof resetSync;
  'sync-repair': typeof repairSync;
};

export const app = createApp<SyncHandlers>();
app.method('sync', sync);
app.method('sync-reset', resetSync);
app.method('sync-repair', repairSync);

async function sync() {
  const result = await fullSync();
  await waitForPostSyncWork();
  return result;
}

async function resetSync() {
  return await _resetSync();
}

async function repairSync() {
  await _repairSync();
}
