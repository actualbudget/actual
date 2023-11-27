/* eslint-disable import/no-unused-modules */

// eslint-disable-next-line import/extensions
import * as bundle from './app/bundle.api.js';
import * as injected from './injected';

let actualApp;
export const internal = bundle.lib;

// DEPRECATED: remove the next line in @actual-app/api v7
export * as methods from './methods';

export * from './methods';
export * as utils from './utils';

function validateNodeVersion() {
  if (process?.versions?.node) {
    const nodeVersion = process?.versions?.node;
    const majorVersionString = nodeVersion.split('.')[0];
    const majorVersionNumber = parseInt(majorVersionString);
    if (majorVersionNumber < 18) {
      throw new Error(
        `@actual-app/api requires a node version >= 18. Found that you are using: ${nodeVersion}. Please upgrade to a higher version`,
      );
    }
  }
}

export async function init(config = {}) {
  if (actualApp) {
    return;
  }

  validateNodeVersion();

  global.fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

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
