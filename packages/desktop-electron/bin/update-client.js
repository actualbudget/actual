#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const b = new BuildScript('desktop-electron', async () => {
  await b.fs.emptyDir('client-build');
  await b.fs.copy(b.clientBuildDir, 'client-build');

  // Remove the embedded backend for the browser version. Will improve this process
  await b.fs.rmdir('client-build/data');
  await b.fs.removeFiles('client-build/*.kcab.*');
  await b.fs.removeFiles('client-build/*{wasm,map}');
});

b.run();
