#!/usr/bin/env node
const { join, fs, build } = require('@actual-app/bin');

async function main() {
  await fs.rmdir(build.desktopBuildDir);
  await fs.copy(build.clientBuildDir, build.desktopBuildDir);

  // Remove the embedded backend for the browser version. Will improve this process
  await fs.rmdir(join(build.desktopBuildDir, 'data'));
  await fs.removeFiles(join(build.desktopBuildDir, '**/*.kcab.*'));
  await fs.removeFiles(join(build.desktopBuildDir, '**/*wasm'));
  await fs.removeFiles(join(build.desktopBuildDir, '**/*map'));
}

main();
