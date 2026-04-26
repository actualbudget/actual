import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CACHE_FILE_NAME,
  decideSyncAction,
  readCacheState,
  writeCacheState,
} from './cache';

describe('readCacheState', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'actual-cli-cache-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when the file does not exist', () => {
    expect(readCacheState(dir)).toBeNull();
  });

  it('returns null when the file is corrupt', () => {
    writeFileSync(join(dir, CACHE_FILE_NAME), 'not json');
    expect(readCacheState(dir)).toBeNull();
  });

  it('returns null when the file has the wrong version', () => {
    writeFileSync(
      join(dir, CACHE_FILE_NAME),
      JSON.stringify({
        version: 999,
        syncId: 'a',
        budgetId: 'b',
        serverUrl: 'c',
        lastSyncedAt: 1,
        lastDownloadedAt: 1,
      }),
    );
    expect(readCacheState(dir)).toBeNull();
  });

  it('returns the parsed state when the file is valid', () => {
    writeFileSync(
      join(dir, CACHE_FILE_NAME),
      JSON.stringify({
        version: 1,
        syncId: 'a',
        budgetId: 'b',
        serverUrl: 'c',
        lastSyncedAt: 1234,
        lastDownloadedAt: 5678,
      }),
    );
    expect(readCacheState(dir)).toEqual({
      version: 1,
      syncId: 'a',
      budgetId: 'b',
      serverUrl: 'c',
      lastSyncedAt: 1234,
      lastDownloadedAt: 5678,
    });
  });
});

describe('writeCacheState', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'actual-cli-cache-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the state to the cache file', () => {
    writeCacheState(dir, {
      version: 1,
      syncId: 'a',
      budgetId: 'b',
      serverUrl: 'c',
      lastSyncedAt: 1,
      lastDownloadedAt: 1,
    });
    const raw = readFileSync(join(dir, CACHE_FILE_NAME), 'utf-8');
    expect(JSON.parse(raw).syncId).toBe('a');
  });

  it('is atomic: removes the tmp file after rename', () => {
    writeCacheState(dir, {
      version: 1,
      syncId: 'a',
      budgetId: 'b',
      serverUrl: 'c',
      lastSyncedAt: 1,
      lastDownloadedAt: 1,
    });
    expect(existsSync(join(dir, `${CACHE_FILE_NAME}.tmp`))).toBe(false);
  });

  it('does not throw when the filesystem refuses the write', () => {
    // Force ENOTDIR by pointing writeCacheState at a path whose parent is a
    // regular file — no OS-specific pseudo-filesystem semantics needed.
    const file = join(dir, 'not-a-dir');
    writeFileSync(file, '');
    expect(() =>
      writeCacheState(join(file, 'nested'), {
        version: 1,
        syncId: 'a',
        budgetId: 'b',
        serverUrl: 'c',
        lastSyncedAt: 1,
        lastDownloadedAt: 1,
      }),
    ).not.toThrow();
  });
});

describe('decideSyncAction', () => {
  const base = {
    state: {
      version: 1 as const,
      syncId: 'sync-1',
      budgetId: 'bud-1',
      serverUrl: 'http://s',
      lastSyncedAt: 1_000_000,
      lastDownloadedAt: 1_000_000,
    },
    config: { syncId: 'sync-1', serverUrl: 'http://s' },
    now: 1_000_000,
    ttlMs: 60_000,
    mutates: false,
    refresh: false,
    encrypted: false,
  };

  it('returns "download" when state is null', () => {
    expect(decideSyncAction({ ...base, state: null }).action).toBe('download');
  });

  it('returns "download" when syncId changed', () => {
    expect(
      decideSyncAction({
        ...base,
        config: { ...base.config, syncId: 'other' },
      }).action,
    ).toBe('download');
  });

  it('returns "download" when serverUrl changed', () => {
    expect(
      decideSyncAction({
        ...base,
        config: { ...base.config, serverUrl: 'http://other' },
      }).action,
    ).toBe('download');
  });

  it('returns "skip" for a read within the TTL', () => {
    expect(decideSyncAction({ ...base, now: 1_000_000 + 30_000 }).action).toBe(
      'skip',
    );
  });

  it('returns "sync" for a read past the TTL', () => {
    expect(decideSyncAction({ ...base, now: 1_000_000 + 61_000 }).action).toBe(
      'sync',
    );
  });

  it('returns "sync" for a write even when fresh', () => {
    expect(decideSyncAction({ ...base, mutates: true }).action).toBe('sync');
  });

  it('returns "sync" when refresh is true', () => {
    expect(decideSyncAction({ ...base, refresh: true }).action).toBe('sync');
  });

  it('returns "sync" when ttlMs is 0', () => {
    expect(decideSyncAction({ ...base, ttlMs: 0 }).action).toBe('sync');
  });

  it('returns "sync" for encrypted budgets within the TTL', () => {
    expect(decideSyncAction({ ...base, encrypted: true }).action).toBe('sync');
  });

  it('treats clock skew (negative age) as stale', () => {
    expect(decideSyncAction({ ...base, now: 999_999 }).action).toBe('sync');
  });

  it('carries cached state on non-download actions', () => {
    const decision = decideSyncAction({ ...base, mutates: true });
    expect(decision).toEqual({ action: 'sync', state: base.state });
  });
});
