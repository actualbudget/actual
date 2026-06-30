import { rmSync } from 'node:fs';
import { join } from 'node:path';

import type { Command } from 'commander';

import { CACHE_FILE_NAME, getMetaDir, readCacheState } from '#cache';
import type { CliConfig } from '#config';
import { resolveConfig } from '#config';
import { withConnection } from '#connection';
import { acquireExclusive } from '#lock';
import { printOutput } from '#output';

type SyncCmdOpts = {
  status?: boolean;
  clear?: boolean;
};

async function requireSyncIdAndMeta(
  opts: Record<string, unknown>,
  flag: string,
): Promise<{ config: CliConfig; meta: string }> {
  const config = await resolveConfig(opts);
  if (!config.syncId) {
    throw new Error(
      `Sync ID is required for sync ${flag}. Set --sync-id or ACTUAL_SYNC_ID.`,
    );
  }
  return { config, meta: getMetaDir(config.dataDir, config.syncId) };
}

export function registerSyncCommand(program: Command) {
  program
    .command('sync')
    .description(
      'Sync the local cached budget with the server, print cache status, or clear the cache',
    )
    .option('--status', 'Print cache status without syncing', false)
    .option(
      '--clear',
      'Delete the local cache; next command re-downloads',
      false,
    )
    .action(async (cmdOpts: SyncCmdOpts) => {
      const opts = program.opts();

      if (cmdOpts.status) {
        const { config, meta } = await requireSyncIdAndMeta(opts, '--status');
        const state = readCacheState(meta);
        if (state === null) {
          printOutput(
            {
              neverSynced: true,
              syncId: config.syncId,
              ttlSeconds: config.cacheTtl,
            },
            opts.format,
          );
          return;
        }
        const rawAgeSeconds = Math.round(
          (Date.now() - state.lastSyncedAt) / 1000,
        );
        const ageSeconds = Math.max(0, rawAgeSeconds);
        printOutput(
          {
            neverSynced: false,
            syncId: state.syncId,
            budgetId: state.budgetId,
            syncedAt: new Date(state.lastSyncedAt).toISOString(),
            lastDownloadedAt: new Date(state.lastDownloadedAt).toISOString(),
            ageSeconds,
            ttlSeconds: config.cacheTtl,
            stale: rawAgeSeconds < 0 || rawAgeSeconds > config.cacheTtl,
          },
          opts.format,
        );
        return;
      }

      if (cmdOpts.clear) {
        const { config, meta } = await requireSyncIdAndMeta(opts, '--clear');
        // Serialize with concurrent writers so we don't rm a half-written
        // state.json that's about to be renamed into place.
        const release = config.noLock
          ? null
          : await acquireExclusive(meta, {
              timeoutMs: config.lockTimeout * 1000,
            });
        try {
          rmSync(join(meta, CACHE_FILE_NAME), { force: true });
        } finally {
          await release?.();
        }
        printOutput({ cleared: true, syncId: config.syncId }, opts.format);
        return;
      }

      await withConnection(
        opts,
        async config => {
          const state = config.syncId
            ? readCacheState(getMetaDir(config.dataDir, config.syncId))
            : null;
          printOutput(
            {
              syncedAt: new Date(
                state?.lastSyncedAt ?? Date.now(),
              ).toISOString(),
              syncId: config.syncId,
              budgetId: state?.budgetId ?? config.syncId,
            },
            opts.format,
          );
        },
        { mutates: true },
      );
    });
}
