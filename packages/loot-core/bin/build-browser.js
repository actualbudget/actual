#!/usr/bin/env node
/* eslint-disable */
const BuildScript = require('@actual-app/bin');

const b = new BuildScript('loot-core', async () => {
  const buildDir = b.workerBuildDir;
  const clientOutputDir = b.clientWorkerDir;

  await b.migrations.copy(b.packageRoot, b.clientDataDir);
  await b.migrations.createIndexFile(b.clientDataDir);
  
  // Clean out previous build files
  await b.fs.emptyDir(buildDir);
  await b.fs.rmdir(clientOutputDir);

  const command = [
    'yarn webpack --config webpack/webpack.browser.config.js ',
    '--target webworker ',
    '--output-filename kcab.worker.', b.outputHash, '.js ',
    '--output-chunk-filename [id].[name].kcab.worker.', b.outputHash, '.js ',
    '--progress ',
  ];

  if (b.isDev) {
    // In dev mode, always enable watch mode and symlink the build files.
    // Make sure to do this before starting the build since watch mode will block
    command.push(' --watch');
    await b.fs.ensureSymlink(buildDir, clientOutputDir);
  }

  await b.exec(command.join(''));

  if (b.isProduction) {
    // In production, just copy the built files
    await b.fs.ensureDir(clientOutputDir);
    await b.fs.copy(buildDir, clientOutputDir);
  }
});

b.run();
