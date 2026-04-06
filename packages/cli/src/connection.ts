import { mkdirSync } from 'fs';

import * as api from '@actual-app/api';

import { resolveConfig } from './config';
import type { CliGlobalOpts } from './config';

function info(message: string, verbose?: boolean) {
  if (verbose) {
    process.stderr.write(message + '\n');
  }
}

type ConnectionOptions = {
  loadBudget?: boolean;
};

export async function withConnection<T>(
  globalOpts: CliGlobalOpts,
  fn: () => Promise<T>,
  options: ConnectionOptions = {},
): Promise<T> {
  const { loadBudget = true } = options;
  const config = await resolveConfig(globalOpts);

  mkdirSync(config.dataDir, { recursive: true });

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
    if (loadBudget && config.syncId) {
      info(`Downloading budget ${config.syncId}...`, globalOpts.verbose);
      await api.downloadBudget(config.syncId, {
        password: config.encryptionPassword,
      });
    } else if (loadBudget && !config.syncId) {
      throw new Error(
        'Sync ID is required for this command. Set --sync-id or ACTUAL_SYNC_ID.',
      );
    }
    return await fn();
  } finally {
    await api.shutdown();
  }
}
