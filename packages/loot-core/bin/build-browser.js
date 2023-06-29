#!/usr/bin/env node
/* eslint-disable */
const BuildScript = require('@actual-app/bin');

const build = new BuildScript('loot-core', async () => {
  const BUILD_DIR = build.workerBuildDir;
  const CLIENT_BUILD_DIR = build.clientWorkerDir;

  await build.fs.ensureDir(build.clientDataDir);
  await build.migrations.copyMigrations(build.packageRoot, build.clientDataDir);

  let files = await build.fs.findFiles(build.clientDataDir, '**', true);
  await build.fs.writeFile(
    build.clientDataIdxFileName,
    files.sort().join('\n'),
  );

  // Clean out previous build files
  await build.fs.emptyDir(BUILD_DIR);
  await build.fs.rmdir(CLIENT_BUILD_DIR);

  const command = [
    'yarn webpack --config webpack/webpack.browser.config.js ',
    '--target webworker ',
    '--output-filename kcab.worker.', build.outputHash, '.js ',
    '--output-chunk-filename [id].[name].kcab.worker.', build.outputHash, '.js ',
    '--progress ',
  ];

  if (process.env.NODE_ENV === 'development') {
    // In dev mode, always enable watch mode and symlink the build files.
    // Make sure to do this before starting the build since watch mode will block
    command.push(' --watch');
    await build.fs.ensureSymlink(BUILD_DIR, CLIENT_BUILD_DIR);
  }

  await build.exec(command.join(''));

  if (process.env.NODE_ENV === 'production') {
    // In production, just copy the built files
    await build.fs.ensureDir(CLIENT_BUILD_DIR);
    await build.fs.copy(BUILD_DIR, CLIENT_BUILD_DIR);
  }
});

build.run();
