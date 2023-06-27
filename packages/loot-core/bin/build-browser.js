#!usr/bin/env node
const { fs, shell, webpackUtil, migrations, build } = require('@actual-app/bin');

const ROOT = build.workerRoot;
const BUILD_DIR = build.workerBuildDir;
const CLIENT_DATA_DIR = build.clientDataDir;
const CLIENT_BUILD_DIR = build.clientWorkerDir;

async function prepareBuildFiles() {
  await migrations.copyMigrations(ROOT, CLIENT_DATA_DIR);

  // Create an index file of all the public data files that need processing
  let files = await fs.findFiles(CLIENT_DATA_DIR, '**', true);
  await fs.writeFile(build.clientDataIndexFileName, files.sort().join('\n'));

  await fs.emptyDir(BUILD_DIR);
  await fs.rmdir(CLIENT_BUILD_DIR);

  // In dev mode, symlink the build files.
  if (process.env.NODE_ENV === 'development') {
    await fs.ensureSymlink(BUILD_DIR, CLIENT_BUILD_DIR);
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
  ];

  if (process.env.NODE_ENV === 'development') {
    // In dev mode enable watch, make sure to do it before starting the build
    // as watch will block
    command.push(' --watch');
  }

  await shell.exec(command.join(''));
}

async function main() {
  await prepareBuildFiles();
  await executeWebpack();
 
  if (process.env.NODE_ENV === 'production') {
    // In production, just copy the built files
    await fs.ensureDir(BUILD_DIR);
    await fs.copy(BUILD_DIR, CLIENT_BUILD_DIR);
  }
}

main();
