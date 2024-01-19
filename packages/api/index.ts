import type {
  RequestInfo as FetchInfo,
  RequestInit as FetchInit,
  // @ts-ignore: false-positive commonjs module error on build until typescript 5.3
} from 'node-fetch'; // with { 'resolution-mode': 'import' };

// loot-core types
import type { InitConfig } from 'loot-core/server/main';

// @ts-ignore: bundle not available until we build it
// eslint-disable-next-line import/extensions
import * as bundle from './app/bundle.api.js';
import * as injected from './injected';
import { validateNodeVersion } from './validateNodeVersion';

let actualApp: null | typeof bundle.lib;
export const internal = bundle.lib;

// DEPRECATED: remove the next line in @actual-app/api v7
export * as methods from './methods';

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
    await actualApp.send('sync');
    await actualApp.send('close-budget');
    actualApp = null;
  }
}
