#!/usr/bin/env node
const BuildScript = require('@actual-app/bin');

const build = new BuildScript('loot-core', async () => {
  const destDir = build.join(build.packageRoot, process.argv[2]);
  await build.migrations.copyMigrations(build.packageRoot, destDir);
});

build.run();
