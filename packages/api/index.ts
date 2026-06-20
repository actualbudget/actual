import { init as initLootCore } from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

/** @deprecated Please use return value of `init` instead */
export let internal: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  const initConfig =
    'password' in config && config.password
      ? { ...config, loginMethod: 'password' as const }
      : config;

  internal = await initLootCore(initConfig);
  return internal;
}

export async function shutdown() {
  if (internal) {
    try {
      await internal.send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }

    await internal.send('close-budget');
    internal = null;
  }
}
