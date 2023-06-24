#!usr/bin/env node
const { fsUtil, Path } = require('../../../bin/utils');

const ROOT = process.cwd();
const BUILD_DIR = Path.join(ROOT, '/client-build');

async function main() {
  fsUtil.rmdir(BUILD_DIR);
  fsUtil.copyFiles(Path.join(ROOT, '../desktop-client/build'), BUILD_DIR);

  // Remove the embedded backend for the browser version. Will improve this process
  fsUtil.rmdir(Path.join(BUILD_DIR, '/data'));
  fsUtil.emptyDir(BUILD_DIR, /.*kcab.*/);
  fsUtil.emptyDir(BUILD_DIR, /.*wasm/);
  fsUtil.emptyDir(BUILD_DIR, /.*map/);
}

main();
