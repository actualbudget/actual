import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as api from '@actual-app/api';

import { getMetaDir, writeCacheState } from './cache';
import { resolveConfig } from './config';
import { withConnection } from './connection';

vi.mock('@actual-app/api', () => ({
  init: vi.fn().mockResolvedValue(undefined),
  downloadBudget: vi.fn().mockResolvedValue(undefined),
  loadBudget: vi.fn().mockResolvedValue(undefined),
  sync: vi.fn().mockResolvedValue(undefined),
  shutdown: vi.fn().mockResolvedValue(undefined),
  getBudgets: vi
    .fn()
    .mockResolvedValue([{ id: 'bud-disk-1', groupId: 'sync-1' }]),
}));

vi.mock('./config', () => ({
  resolveConfig: vi.fn(),
}));

let dataDir: string;

function metaDirFor(syncId: string) {
  return getMetaDir(dataDir, syncId);
}

function setConfig(overrides: Record<string, unknown> = {}) {
  vi.mocked(resolveConfig).mockResolvedValue({
    serverUrl: 'http://test',
    password: 'pw',
    dataDir,
    syncId: 'sync-1',
    cacheTtl: 60,
    lockTimeout: 10,
    refresh: false,
    noLock: true,
    ...overrides,
  });
}

describe('withConnection', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    dataDir = mkdtempSync(join(tmpdir(), 'actual-cli-conn-'));
    setConfig();
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('calls api.init with password when no sessionToken', async () => {
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.init).toHaveBeenCalledWith({
      serverURL: 'http://test',
      password: 'pw',
      dataDir,
      verbose: undefined,
    });
  });

  it('calls api.init with sessionToken when present', async () => {
    setConfig({ sessionToken: 'tok', password: undefined });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.init).toHaveBeenCalledWith({
      serverURL: 'http://test',
      sessionToken: 'tok',
      dataDir,
      verbose: undefined,
    });
  });

  it('first run: calls downloadBudget and writes cache state', async () => {
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.downloadBudget).toHaveBeenCalledWith('sync-1', {
      password: undefined,
    });
    expect(api.sync).not.toHaveBeenCalled();
  });

  it('skips sync on a read inside the TTL', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.loadBudget).toHaveBeenCalledWith('bud-disk-1');
    expect(api.sync).not.toHaveBeenCalled();
    expect(api.downloadBudget).not.toHaveBeenCalled();
  });

  it('syncs on a read past the TTL', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now() - 10 * 60_000,
      lastDownloadedAt: Date.now() - 10 * 60_000,
    });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.loadBudget).toHaveBeenCalled();
    expect(api.sync).toHaveBeenCalledTimes(1);
  });

  it('write command syncs before and after the callback, even when fresh', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    await withConnection({}, async () => 'ok', { mutates: true });
    expect(api.loadBudget).toHaveBeenCalled();
    expect(api.sync).toHaveBeenCalledTimes(2);
  });

  it('--refresh forces a sync on a read inside the TTL', async () => {
    setConfig({ refresh: true });
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.sync).toHaveBeenCalledTimes(1);
  });

  it('encrypted budget forces a sync on a read inside the TTL', async () => {
    setConfig({ encryptionPassword: 'secret' });
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.sync).toHaveBeenCalledTimes(1);
  });

  it('invalidates cache when syncId changes', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'OTHER',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.downloadBudget).toHaveBeenCalled();
  });

  it('skips budget work when skipBudget is true', async () => {
    await withConnection({}, async () => 'ok', {
      mutates: false,
      skipBudget: true,
    });
    expect(api.downloadBudget).not.toHaveBeenCalled();
    expect(api.loadBudget).not.toHaveBeenCalled();
    expect(api.sync).not.toHaveBeenCalled();
  });

  it('throws when syncId is missing and skipBudget is false', async () => {
    setConfig({ syncId: undefined });
    await expect(
      withConnection({}, async () => 'ok', { mutates: false }),
    ).rejects.toThrow('Sync ID is required');
  });

  it('returns the callback result', async () => {
    const result = await withConnection({}, async () => 42, {
      mutates: false,
    });
    expect(result).toBe(42);
  });

  it('calls api.shutdown on success', async () => {
    await withConnection({}, async () => 'ok', { mutates: false });
    expect(api.shutdown).toHaveBeenCalled();
  });

  it('calls api.shutdown on error', async () => {
    await expect(
      withConnection(
        {},
        async () => {
          throw new Error('boom');
        },
        { mutates: false },
      ),
    ).rejects.toThrow('boom');
    expect(api.shutdown).toHaveBeenCalled();
  });

  it('propagates sync errors on a stale read', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now() - 10 * 60_000,
      lastDownloadedAt: Date.now() - 10 * 60_000,
    });
    vi.mocked(api.sync).mockRejectedValueOnce(new Error('network'));
    await expect(
      withConnection({}, async () => 'ok', { mutates: false }),
    ).rejects.toThrow('network');
  });
});
