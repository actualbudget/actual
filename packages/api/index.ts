import type {
  RequestInfo as FetchInfo,
  RequestInit as FetchInit,
} from 'node-fetch';

// loot-core types
import type { InitConfig } from 'loot-core/server/main';

// oxlint-disable-next-line typescript/ban-ts-comment
// @ts-ignore: bundle not available until we build it
import * as bundle from './app/bundle.api.js';
import * as injected from './injected';
import { validateNodeVersion } from './validateNodeVersion';

let actualApp: null | typeof bundle.lib;
export const internal = bundle.lib;

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

  await bundle.init(config);
  actualApp = bundle.lib;

  injected.override(bundle.lib.send);
  return bundle.lib;
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
