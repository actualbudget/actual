#!/usr/bin/env node
const { fs, build, packageRoot } = require('@actual-app/bin');

process.chdir(packageRoot('desktop-electron'));

async function main() {
  await fs.emptyDir('client-build');
  await fs.copy(build.clientBuildDir, 'client-build');

  // Remove the embedded backend for the browser version. Will improve this process
  await fs.rmdir('client-build/data');
  await fs.removeFiles('client-build/*.kcab.*');
  await fs.removeFiles('client-build/*wasm');
  await fs.removeFiles('client-build/*map');
}

main();
