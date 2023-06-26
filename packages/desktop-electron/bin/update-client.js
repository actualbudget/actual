#!usr/bin/env node
const { fsUtil, join, packageRoot, fs } = require('@actual-app/bin');

const ROOT = packageRoot('desktop-electron')

async function main() {
  const clientBuildDir = join(packageRoot('desktop-client'), 'build');
  const buildDir = join(ROOT, 'client-build');

  await fsUtil.rmdir(buildDir);
  await fs.copy(clientBuildDir, buildDir);

  // Remove the embedded backend for the browser version. Will improve this process
  await fsUtil.rmdir(join(buildDir, 'data'));
  await fsUtil.removeFiles(join(buildDir,'**/*.kcab.*'));
  await fsUtil.removeFiles(join(buildDir,'**/*wasm'));
  await fsUtil.removeFiles(join(buildDir,'**/*map'));
}

main();
