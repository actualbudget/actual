import type {
  RequestInfo as FetchInfo,
  RequestInit as FetchInit,
} from 'node-fetch';

import { init as initLootCore } from 'loot-core/server/main';
import type { InitConfig, lib } from 'loot-core/server/main';

import { validateNodeVersion } from './validateNodeVersion';

export * from './methods';
export * as utils from './utils';

/** @deprecated Please use return value of `init` instead */
export let internal: typeof lib | null = null;

export async function init(config: InitConfig = {}) {
  validateNodeVersion();

  if (!globalThis.fetch) {
    globalThis.fetch = (url: URL | RequestInfo, init?: RequestInit) => {
      return import('node-fetch').then(({ default: fetch }) =>
        fetch(url as unknown as FetchInfo, init as unknown as FetchInit),
      ) as unknown as Promise<Response>;
    };
  }

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
