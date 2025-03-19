import { createApp } from '../app';

import { repairSync as _repairSync } from './repair';
import { resetSync as _resetSync } from './reset';

import { fullSync } from '.';

export type SyncHandlers = {
  sync: typeof sync;
  'sync-reset': typeof resetSync;
  'sync-repair': typeof repairSync;
};

export const app = createApp<SyncHandlers>();
app.method('sync', sync);
app.method('sync-reset', resetSync);
app.method('sync-repair', repairSync);

function sync() {
  return fullSync();
}

function resetSync() {
  return _resetSync();
}

async function repairSync() {
  await _repairSync();
}
