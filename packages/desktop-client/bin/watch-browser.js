#!usr/bin/env node
const { webpackUtil, shellUtil, Path, fsUtil } = require('../../../bin/utils');

const ROOT = process.cwd();

async function main() {
  const version = await fsUtil.getVersion(Path.join(ROOT, '../package.json'));
  const env = {
    IS_GENERIC_BROWSER: 1,
    PORT: 3001,
    REACT_APP_BACKEND_WORKER_HASH: await webpackUtil.getWorkerFileHash(
      Path.join(ROOT, '/public/kcab'),
    ),
    REACT_APP_ACTUAL_VERSION: version,
  };

  shellUtil.executeShellCmd('yarn start', env);
}

main();
