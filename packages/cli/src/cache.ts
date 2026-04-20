import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isRecord } from './utils';

export const CACHE_FILE_NAME = 'state.json';
export const CACHE_VERSION = 1;
export const META_ROOT_DIR = '.actual-cli';

export type CacheState = {
  version: typeof CACHE_VERSION;
  syncId: string;
  budgetId: string;
  serverUrl: string;
  lastSyncedAt: number;
  lastDownloadedAt: number;
};

export function getMetaDir(dataDir: string, syncId: string): string {
  return join(dataDir, META_ROOT_DIR, syncId);
}

function cachePath(metaDir: string): string {
  return join(metaDir, CACHE_FILE_NAME);
}

function isCacheState(value: unknown): value is CacheState {
  if (!isRecord(value)) return false;
  return (
    value.version === CACHE_VERSION &&
    typeof value.syncId === 'string' &&
    typeof value.budgetId === 'string' &&
    typeof value.serverUrl === 'string' &&
    typeof value.lastSyncedAt === 'number' &&
    typeof value.lastDownloadedAt === 'number'
  );
}

export function readCacheState(metaDir: string): CacheState | null {
  let raw: string;
  try {
    raw = readFileSync(cachePath(metaDir), 'utf-8');
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isCacheState(parsed) ? parsed : null;
}

export function writeCacheState(metaDir: string, state: CacheState): void {
  try {
    mkdirSync(metaDir, { recursive: true });
    const target = cachePath(metaDir);
    // Unique tmp name per writer: concurrent shared-lock commands (encrypted
    // budgets, --refresh, stale TTL) can both publish, and a shared tmp path
    // lets the second writer's truncate destroy the first writer's bytes
    // before either renames into place.
    const tmp = `${target}.${process.pid}-${randomBytes(4).toString('hex')}.tmp`;
    writeFileSync(tmp, JSON.stringify(state));
    renameSync(tmp, target);
  } catch {
    // Cache persistence is best-effort. A read-only or unreachable dir must
    // not crash the CLI; the next invocation simply won't find a cache.
  }
}

export type SyncDecision =
  | { action: 'download' }
  | { action: 'skip'; state: CacheState }
  | { action: 'sync'; state: CacheState };

export type DecideSyncArgs = {
  state: CacheState | null;
  config: { syncId: string; serverUrl: string };
  now: number;
  ttlMs: number;
  mutates: boolean;
  refresh: boolean;
  encrypted: boolean;
};

export function decideSyncAction({
  state,
  config,
  now,
  ttlMs,
  mutates,
  refresh,
  encrypted,
}: DecideSyncArgs): SyncDecision {
  if (state === null) return { action: 'download' };
  if (state.syncId !== config.syncId) return { action: 'download' };
  if (state.serverUrl !== config.serverUrl) return { action: 'download' };
  if (mutates || refresh || ttlMs === 0 || encrypted) {
    return { action: 'sync', state };
  }
  const age = now - state.lastSyncedAt;
  if (age < 0) return { action: 'sync', state };
  if (age < ttlMs) return { action: 'skip', state };
  return { action: 'sync', state };
}
