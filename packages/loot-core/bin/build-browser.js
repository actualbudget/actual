#!usr/bin/env node
const { fsUtil, shellUtil, webpackUtil, Path } = require('../../../bin/utils');

const migrationUtil = require('./migration-util');

const ROOT = Path.join(process.cwd(), '/bin'); //Make path consistent with bash
const DATA_DIR = Path.join(ROOT, '../../desktop-client/public/data');
const LOCAL_BUILD_FILES = Path.join(ROOT, '../lib-dist/browser');
const CLIENT_BUILD_FILES = Path.join(ROOT, '../../desktop-client/public/kcab');

// Add custom webpack args here
let WEBPACK_ARGS = '';

async function prepareBuildFiles() {
  await fsUtil.emptyDir(LOCAL_BUILD_FILES);
  await fsUtil.rmdir(CLIENT_BUILD_FILES);

  // Create an index file of all the public data files that need processing
  // The seperator is hard coded to /, so replace the platform separator
  let files = await fsUtil.listFiles(DATA_DIR, {
    includeSubDirs: true,
    excludeRootDir: true,
  });
  files = files.map(file => file.replace(Path.sep, '/')).sort();

  await fsUtil.writeStringArrayToFile(
    files,
    Path.join(DATA_DIR, '../data-file-index.txt'),
  );
}

async function setupForDevEnvironment() {
  // In dev mode, always enable watch mode and symlink the build files.
  // Make sure to do this before starting the build since watch mode
  // will block
  if (process.env.NODE_ENV === 'development') {
    WEBPACK_ARGS += ' --watch';
    await fsUtil.createSymlink(LOCAL_BUILD_FILES, CLIENT_BUILD_FILES);
  }
}

/* eslint-disable prettier/prettier */
async function executeWebpack() {
  const hash = webpackUtil.getContentHash();
  const command = [
    'yarn webpack --config webpack/webpack.browser.config.js ',
    '--target webworker ',
    '--output-filename kcab.worker.', hash, '.js ',
    '--output-chunk-filename [id].[name].kcab.worker.', hash, 'js ',
    '--progress ',
    WEBPACK_ARGS,
  ].join('');

  await shellUtil.executeShellCmd(command);
}

async function postBuild() {
  if (process.env.NODE_ENV === 'production') {
    // In production, just copy the built files
    await fsUtil.mkdir(LOCAL_BUILD_FILES);
    await fsUtil.copyFiles(LOCAL_BUILD_FILES, CLIENT_BUILD_FILES);
  }
}

async function main() {
  console.log('Node Version: ' + process.version);
  console.log('Working Directory: ' + process.cwd());

  await fsUtil.mkdir(DATA_DIR);
  await migrationUtil.copyMigrations(Path.join(ROOT, '../'), DATA_DIR);

  await prepareBuildFiles();
  await setupForDevEnvironment();
  await executeWebpack();
  await postBuild();
}

main();
