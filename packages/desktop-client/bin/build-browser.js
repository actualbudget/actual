#!/usr/bin/env node
const { fsUtil, webpackUtil, shellUtil, join, packageRoot, packageVersion} = require('@actual-app/bin');

const ROOT = packageRoot('desktop-client');

async function main() {
  const version = await packageVersion('desktop-client');

  console.log('Building version ' + version + ' for the browser...');

  const env = {
    IS_GENERIC_BROWSER: 1,
    INLINE_RUNTIME_CHUNK: false,
    REACT_APP_BACKEND_WORKER_HASH: await webpackUtil.getWorkerFileHash(
      join(ROOT, 'public/kcab'),
    ),
    REACT_APP_ACTUAL_VERSION: version,
  };

  await fsUtil.rmdir(join(ROOT, 'build'));
  await shellUtil.executeShellCmd('yarn build', env);
}

main();
