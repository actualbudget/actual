import { dirname, basename } from 'path';

import fetch from 'node-fetch';
import 'source-map-support/register';

// eslint-disable-next-line import/extensions
import bundle from './lib-dist/bundle.desktop.js';

global.fetch = fetch;

async function init(budgetPath) {
  const dir = dirname(budgetPath);
  const budgetId = basename(budgetPath);
  await bundle.initEmbedded('0.0.147', true, dir);
  await bundle.lib.send('load-budget', { id: budgetId });

  return bundle.lib;
}

async function run() {
  const { send } = await init('/tmp/_test-budget');
  const accounts = await send('accounts-get');

  await send('transaction-add', {
    date: '2022-03-20',
    account: accounts[0].id,
    amount: 1000,
  });

  await new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, 5000);
  });

  await send('close-budget');
}

run();
