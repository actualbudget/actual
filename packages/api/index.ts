import { init as initLootCore } from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

/** @deprecated Please use return value of `init` instead */
export let internal: typeof lib | null = null;

let ownsSession = false;

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  internal = await initLootCore(config);
  ownsSession = Boolean(config.serverURL && config.password);
  return internal;
}

export async function shutdown() {
  if (internal) {
    try {
      await internal.send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }

    try {
      await internal.send('close-budget');
    } finally {
      try {
        if (ownsSession) {
          await internal.send('subscribe-sign-out');
        }
      } finally {
        ownsSession = false;
        internal = null;
      }
    }
  }
}
