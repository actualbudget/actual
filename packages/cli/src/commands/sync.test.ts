import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Command } from 'commander';

import { CACHE_FILE_NAME, getMetaDir, writeCacheState } from '#cache';
import { resolveConfig } from '#config';

import { registerSyncCommand } from './sync';

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

vi.mock('#config', () => ({
  resolveConfig: vi.fn(),
}));

let dataDir: string;

function metaDirFor(syncId: string) {
  return getMetaDir(dataDir, syncId);
}

function program() {
  const p = new Command();
  p.exitOverride();
  p.option('--sync-id <id>');
  p.option('--data-dir <path>');
  p.option('--format <fmt>');
  p.option('--verbose');
  registerSyncCommand(p);
  return p;
}

describe('actual sync', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    dataDir = mkdtempSync(join(tmpdir(), 'actual-cli-sync-'));
    vi.mocked(resolveConfig).mockResolvedValue({
      serverUrl: 'http://test',
      password: 'pw',
      dataDir,
      syncId: 'sync-1',
      cacheTtl: 60,
      lockTimeout: 10,
      refresh: false,
      noLock: true,
    });
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('runs a sync and prints the syncId', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: 0,
      lastDownloadedAt: 0,
    });
    await program().parseAsync(['node', 'actual', 'sync']);
    const out = stdoutSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join('');
    expect(out).toMatch(/"syncId":\s*"sync-1"/);
  });

  it('--status prints cache info without syncing', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now() - 5000,
      lastDownloadedAt: Date.now() - 5000,
    });
    await program().parseAsync(['node', 'actual', 'sync', '--status']);
    const out = stdoutSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join('');
    expect(out).toMatch(/"stale":\s*(true|false)/);
    expect(out).toMatch(/"ageSeconds":\s*\d+/);
  });

  it('--status on no prior sync reports "never synced" and exits 0', async () => {
    await program().parseAsync(['node', 'actual', 'sync', '--status']);
    const out = stdoutSpy.mock.calls
      .map((c: unknown[]) => String(c[0]))
      .join('');
    expect(out).toMatch(/"neverSynced":\s*true/);
  });

  it('--clear removes the cache file', async () => {
    writeCacheState(metaDirFor('sync-1'), {
      version: 1,
      syncId: 'sync-1',
      budgetId: 'bud-disk-1',
      serverUrl: 'http://test',
      lastSyncedAt: Date.now(),
      lastDownloadedAt: Date.now(),
    });
    expect(existsSync(join(metaDirFor('sync-1'), CACHE_FILE_NAME))).toBe(true);
    await program().parseAsync(['node', 'actual', 'sync', '--clear']);
    expect(existsSync(join(metaDirFor('sync-1'), CACHE_FILE_NAME))).toBe(false);
  });
});
