import * as api from '@actual-app/api';

import type { CacheState } from './cache';
import {
  CACHE_VERSION,
  decideSyncAction,
  getMetaDir,
  readCacheState,
  writeCacheState,
} from './cache';
import type { CliConfig, CliGlobalOpts } from './config';
import { resolveConfig } from './config';
import { acquireExclusive, acquireShared } from './lock';
import type { Release } from './lock';

type ConnectionOptions = {
  mutates: boolean;
  skipBudget?: boolean;
};

function info(message: string, verbose?: boolean) {
  if (verbose) process.stderr.write(message + '\n');
}

async function resolveBudgetIdForSyncId(syncId: string): Promise<string> {
  const budgets = await api.getBudgets();
  const match = budgets.find(
    b =>
      typeof b.id === 'string' &&
      (b.groupId === syncId || b.cloudFileId === syncId),
  );
  if (!match?.id) {
    throw new Error(
      `Could not resolve on-disk budget id for syncId ${syncId} after download.`,
    );
  }
  return match.id;
}

export async function withConnection<T>(
  globalOpts: CliGlobalOpts,
  fn: (config: CliConfig) => Promise<T>,
  { mutates, skipBudget = false }: ConnectionOptions,
): Promise<T> {
  const config = await resolveConfig(globalOpts);

  info(`Connecting to ${config.serverUrl}...`, globalOpts.verbose);

  if (config.sessionToken) {
    await api.init({
      serverURL: config.serverUrl,
      dataDir: config.dataDir,
      sessionToken: config.sessionToken,
      verbose: globalOpts.verbose,
    });
  } else if (config.password) {
    await api.init({
      serverURL: config.serverUrl,
      dataDir: config.dataDir,
      password: config.password,
      verbose: globalOpts.verbose,
    });
  } else {
    throw new Error(
      'Authentication required. Provide --password or --session-token, or set ACTUAL_PASSWORD / ACTUAL_SESSION_TOKEN.',
    );
  }

  try {
    if (skipBudget) return await fn(config);
    if (!config.syncId) {
      throw new Error(
        'Sync ID is required for this command. Set --sync-id or ACTUAL_SYNC_ID.',
      );
    }

    const meta = getMetaDir(config.dataDir, config.syncId);
    let release: Release | null = null;
    if (!config.noLock) {
      release = mutates
        ? await acquireExclusive(meta, {
            timeoutMs: config.lockTimeout * 1000,
          })
        : await acquireShared(meta, {
            timeoutMs: config.lockTimeout * 1000,
          });
    }

    try {
      const cachedState = readCacheState(meta);
      const decision = decideSyncAction({
        state: cachedState,
        config: { syncId: config.syncId, serverUrl: config.serverUrl },
        now: Date.now(),
        ttlMs: config.cacheTtl * 1000,
        mutates,
        refresh: config.refresh,
        encrypted: Boolean(config.encryptionPassword),
      });

      let state: CacheState;
      if (decision.action === 'download') {
        info(
          cachedState === null
            ? `Downloading budget ${config.syncId} for the first time...`
            : `Re-downloading budget ${config.syncId} (cache invalidated)...`,
          globalOpts.verbose,
        );
        await api.downloadBudget(config.syncId, {
          password: config.encryptionPassword,
        });
        const budgetId = await resolveBudgetIdForSyncId(config.syncId);
        const now = Date.now();
        state = {
          version: CACHE_VERSION,
          syncId: config.syncId,
          budgetId,
          serverUrl: config.serverUrl,
          lastSyncedAt: now,
          lastDownloadedAt: now,
        };
        writeCacheState(meta, state);
      } else if (decision.action === 'skip') {
        const age = Math.round(
          (Date.now() - decision.state.lastSyncedAt) / 1000,
        );
        info(`Using cached budget (synced ${age}s ago)...`, globalOpts.verbose);
        await api.loadBudget(decision.state.budgetId);
        state = decision.state;
      } else {
        info(`Syncing budget ${config.syncId}...`, globalOpts.verbose);
        await api.loadBudget(decision.state.budgetId);
        await api.sync();
        state = { ...decision.state, lastSyncedAt: Date.now() };
        writeCacheState(meta, state);
      }

      const result = await fn(config);

      if (mutates) {
        info(`Pushing changes for ${config.syncId}...`, globalOpts.verbose);
        await api.sync();
        state = { ...state, lastSyncedAt: Date.now() };
        writeCacheState(meta, state);
      }

      return result;
    } finally {
      if (release) await release();
    }
  } finally {
    await api.shutdown();
  }
}
