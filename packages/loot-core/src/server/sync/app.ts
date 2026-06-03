import { createApp } from '#server/app';

import { repairSync as _repairSync } from './repair';
import { resetSync as _resetSync } from './reset';

import { fullSync, setSchemaSkewPaused } from '.';

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
  return await fullSync();
}

async function resetSync() {
  // A manual reset re-establishes this device's data as the source of truth, so
  // lift any schema-skew pause and let syncing resume.
  setSchemaSkewPaused(false);
  return await _resetSync();
}

async function repairSync() {
  setSchemaSkewPaused(false);
  await _repairSync();
}
