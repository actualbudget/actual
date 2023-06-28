#!/usr/bin/env node
const { shell, packageVersion, packageRoot } = require('@actual-app/bin');

process.chdir(packageRoot('desktop-client'));

async function main() {
  const version = await packageVersion('desktop-client');

  shell.exec('yarn start', {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: 'dev',
    REACT_APP_ACTUAL_VERSION: version,
  });
}

main();
