// loot-core types
import type { InitConfig } from 'loot-core/server/main';

// @ts-ignore: bundle not available until we build it
import * as bundle from './app/bundle.api.js';
import * as injected from './injected';
import { validateNodeVersion } from './validateNodeVersion';

let actualApp: null | typeof bundle.lib;
export const internal = bundle.lib;

type FetchFn = (
  input: URL | RequestInfo,
  init?: RequestInit,
) => Promise<Response>;

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
        (fetch as unknown as FetchFn)(url, init),
      );
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
