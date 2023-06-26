#!/usr/bin/env node
const { fsUtil, webpackUtil, shellUtil, join, packageRoot, packageVersion} = require('@actual-app/bin');

const ROOT = packageRoot('desktop-client');

async function main() {
  const version = await packageVersion('desktop-client');

  const env = {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: 'dev',
    REACT_APP_ACTUAL_VERSION: version,
  };

  shellUtil.executeShellCmd('yarn start', env);
}

main();
