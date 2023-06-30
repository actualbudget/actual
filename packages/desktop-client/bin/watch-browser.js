#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const build = new BuildScript('desktop-client', async () => {
  build.exec('yarn start', {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: build.outputHash,
  });
});

build.run();
