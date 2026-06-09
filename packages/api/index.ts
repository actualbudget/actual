import {
  lib as coreLib,
  init as initLootCore,
} from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

import { _setSend } from './send';
import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

// In Node the backend runs in-process; methods.ts sends straight to it.
_setSend(coreLib.send);

/** @deprecated Please use return value of `init` instead */
export let internal: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  internal = await initLootCore(config);
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
