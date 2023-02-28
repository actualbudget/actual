let bundle = require('./app/bundle.api.js');
let injected = require('./injected');
let methods = require('./methods');
let utils = require('./utils');
let actualApp;

async function init({ budgetId, config } = {}) {
  if (actualApp) {
    return;
  }

  global.fetch = require('node-fetch');

  await bundle.init({ budgetId, config });
  actualApp = bundle.lib;

  injected.send = bundle.lib.send;
  return bundle.lib;
}

async function shutdown() {
  if (actualApp) {
    await actualApp.send('close-budget');
    actualApp = null;
  }
}

module.exports = {
  init,
  shutdown,
  utils,
  internal: bundle.lib,
  ...methods
};
