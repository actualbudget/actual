import type {
  RequestInfo as FetchInfo,
  RequestInit as FetchInit,
} from 'node-fetch';

// loot-core types
import {
  init as initLootCore,
  lib,
  type InitConfig,
} from 'loot-core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

let actualApp: null | typeof lib;
export const internal = lib;

export * from './methods';
export * as utils from './utils';

export async function init(config: InitConfig = {}) {
  if (actualApp) {
    return;
  }

  validateNodeVersion();

  if (!globalThis.fetch) {
    globalThis.fetch = (url: URL | RequestInfo, init?: RequestInit) => {
      return import('node-fetch').then(({ default: fetch }) =>
        fetch(url as unknown as FetchInfo, init as unknown as FetchInit),
      ) as unknown as Promise<Response>;
    };
  }

  await initLootCore(config);
  actualApp = lib;

  return lib;
}

export async function shutdown() {
  if (actualApp) {
    try {
      await actualApp.send('sync');
    } catch {
      // most likely that no budget is loaded, so the sync failed
    }
    await actualApp.send('close-budget');
    actualApp = null;
  }
}
