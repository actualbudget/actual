#!usr/bin/env node
const { fsUtil, webpackUtil, shellUtil, Path } = require('../../../bin/utils');

const ROOT = process.cwd();

async function main() {
  console.log('Building version ' + VERSION + ' for the browser...');

  const env = {
    IS_GENERIC_BROWSER: 1,
    INLINE_RUNTIME_CHUNK: false,
    REACT_APP_BACKEND_WORKER_HASH: await webpackUtil.getWorkerFileHash(
      Path.join(ROOT, '/public/kcab'),
    ),
    REACT_APP_ACTUAL_VERSION: fsUtil.getVersion(Path.join(ROOT, '../package.json')),
  };

  await fsUtil.rmdir('build');

  await shellUtil.executeShellCmd('yarn build', env);
}

main();
