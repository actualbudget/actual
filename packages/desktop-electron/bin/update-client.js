#!/usr/bin/env node
const { fsUtil, join, packageRoot, fs, build } = require('@actual-app/bin');

const ROOT = packageRoot('desktop-electron')

async function main() {
  await fsUtil.rmdir(build.desktopBuildDir);
  await fs.copy(build.clientBuildDir, build.desktopBuildDir);

  // Remove the embedded backend for the browser version. Will improve this process
  await fsUtil.rmdir(join(build.desktopBuildDir, 'data'));
  await fsUtil.removeFiles(join(build.desktopBuildDir, '**/*.kcab.*'));
  await fsUtil.removeFiles(join(build.desktopBuildDir, '**/*wasm'));
  await fsUtil.removeFiles(join(build.desktopBuildDir, '**/*map'));
}

main();
