#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const b = new BuildScript('desktop-client', async () => {
  console.log('Building the browser...');

  await b.fs.rmdir('build');

  await b.exec('yarn build', {
    IS_GENERIC_BROWSER: 1,
    INLINE_RUNTIME_CHUNK: false,
    REACT_APP_BACKEND_WORKER_HASH: await b.getWorkerFileHash(),
  });

  await b.fs.emptyDir('build-stats');
  await b.fs.move('build/kcab/stats.json', 'build-stats/loot-core-stats.json');
  await b.fs.move('build/stats.json', 'build-stats/desktop-client-stats.json');
});

b.run();
