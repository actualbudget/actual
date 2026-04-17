import { init as initLootCore } from '@actual-app/core/server/main';
import type { InitConfig, lib } from '@actual-app/core/server/main';

export * from './methods';
export * as utils from './utils';

let internalLib: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  internalLib = await initLootCore(config);
  return internalLib;
}

export async function shutdown() {
  if (internalLib) {
    try {
      await internalLib.send('sync');
    } catch {
      // most likely no budget loaded, so sync failed
    }

    await internalLib.send('close-budget');
    internalLib = null;
  }
}
