#!/usr/bin/env node
const { fs, shell, packageVersion, build } = require('@actual-app/bin');

async function main() {
  const version = await packageVersion('desktop-client');

  console.log('Building version ' + version + ' for the browser...');

  const env = {
    IS_GENERIC_BROWSER: 1,
    INLINE_RUNTIME_CHUNK: false,
    REACT_APP_BACKEND_WORKER_HASH: await build.workerFileHash(),
    REACT_APP_ACTUAL_VERSION: version,
  };

  await fs.rmdir(build.clientBuildDir);
  await shell.exec('yarn build', env);
}

main();
