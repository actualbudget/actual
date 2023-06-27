#!usr/bin/env node
const {
  fs,
  shell,
  webpackUtil,
  migrations,
  build,
} = require('@actual-app/bin');

const ROOT = build.workerRoot;
const BUILD_DIR = build.workerBuildDir;
const CLIENT_DATA_DIR = build.clientDataDir;
const CLIENT_BUILD_DIR = build.clientWorkerDir;

async function main() {
  await fs.ensureDir(CLIENT_DATA_DIR);
  await migrations.copyMigrations(ROOT, CLIENT_DATA_DIR);

  let files = await fs.findFiles(CLIENT_DATA_DIR, '**', true);
  await fs.writeFile(build.clientDataIndexFileName, files.sort().join('\n'));

  // Clean out previous build files
  await fs.emptyDir(BUILD_DIR);
  await fs.rmdir(CLIENT_BUILD_DIR);

  const outputHash = webpackUtil.getContentHash();
  const command = [
    'yarn webpack --config webpack/webpack.browser.config.js ',
    '--target webworker ',
    '--output-filename kcab.worker.', outputHash, '.js ',
    '--output-chunk-filename [id].[name].kcab.worker.', outputHash, 'js ',
    '--progress ',
  ];

  if (process.env.NODE_ENV === 'development') {
    // In dev mode, always enable watch mode and symlink the build files.
    // Make sure to do this before starting the build since watch mode will block
    command.push(' --watch');
    await fs.ensureSymlink(BUILD_DIR, CLIENT_BUILD_DIR);
  }

  await shell.exec(command.join(''));
 
  if (process.env.NODE_ENV === 'production') {
    // In production, just copy the built files
    await fs.ensureDir(CLIENT_BUILD_DIR);
    await fs.copy(BUILD_DIR, CLIENT_BUILD_DIR);
  }
}

main();
