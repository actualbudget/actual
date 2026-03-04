import type {
  RequestInfo as FetchInfo,
  RequestInit as FetchInit,
} from 'node-fetch';

import { init as initLootCore, lib } from 'loot-core/server/main';
import type { InitConfig } from 'loot-core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  if (!globalThis.fetch) {
    globalThis.fetch = (url: URL | RequestInfo, init?: RequestInit) => {
      return import('node-fetch').then(({ default: fetch }) =>
        fetch(url as unknown as FetchInfo, init as unknown as FetchInit),
      ) as unknown as Promise<Response>;
    };
  }

  return initLootCore(config);
}

export async function shutdown() {
  try {
    await lib.send('sync');
  } catch {
    // most likely that no budget is loaded, so the sync failed
  }

  await lib.send('close-budget');
}
