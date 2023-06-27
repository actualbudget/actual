#!/usr/bin/env node
const { shell, packageVersion } = require('@actual-app/bin');

async function main() {
  const version = await packageVersion('desktop-client');

  const env = {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: 'dev',
    REACT_APP_ACTUAL_VERSION: version,
  };

  shell.exec('yarn start', env);
}

main();
