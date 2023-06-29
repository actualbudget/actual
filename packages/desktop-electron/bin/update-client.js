#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const build = new BuildScript('desktop-electron', async () => {
  await build.fs.emptyDir('client-build');
  await build.fs.copy(build.clientBuildDir, 'client-build');

  // Remove the embedded backend for the browser version. Will improve this process
  await build.fs.rmdir('client-build/data');
  await build.fs.removeFiles('client-build/*.kcab.*');
  await build.fs.removeFiles('client-build/*wasm');
  await build.fs.removeFiles('client-build/*map');
});

build.run();
