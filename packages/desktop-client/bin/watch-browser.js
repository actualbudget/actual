#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const b = new BuildScript('desktop-client', async () => {
  b.exec('yarn start', {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: b.outputHash,
  });
});

b.run();
