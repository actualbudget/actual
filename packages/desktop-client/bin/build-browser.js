#!/usr/bin/env node
const { fs, shell, packageVersion, packageRoot, build } = require('@actual-app/bin');

async function main() {
  process.chdir(packageRoot('desktop-client'));

  const version = await packageVersion('desktop-client');

  console.log('Building version ' + version + ' for the browser...');

  await fs.rmdir('build');
  
  const env = {
    IS_GENERIC_BROWSER: 1,
    INLINE_RUNTIME_CHUNK: false,
    REACT_APP_BACKEND_WORKER_HASH: await build.workerFileHash(),
    REACT_APP_ACTUAL_VERSION: version,
  };
  
  await shell.exec('yarn build', env);

  await fs.emptyDir('build-stats');
  await fs.move( 'build/kcab/stats.json', 'build-stats/loot-core-stats.json');
  await fs.move('build/stats.json', 'build-stats/desktop-client-stats.json');
}

main();
