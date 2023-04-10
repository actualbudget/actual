import fetch from 'node-fetch';

import * as bundle from './app/bundle.api';
import * as injected from './injected';

let actualApp;
export const internal = bundle.lib;

export * as methods from './methods';
export * as utils from './utils';

export async function init(config = {}) {
  if (actualApp) {
    return;
  }

  global.fetch = fetch;

  await bundle.init(config);
  actualApp = bundle.lib;

  injected.override(bundle.lib.send);
  return bundle.lib;
}

export async function shutdown() {
  if (actualApp) {
    await actualApp.send('close-budget');
    actualApp = null;
  }
}
