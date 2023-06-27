const Path = require('path');

const fs = require('./fs-util');
const migrationUtil = require('./migration-util');
const shellUtil = require('./shell-util');
const webpackUtil = require('./webpack-util');

module.exports.shell = shellUtil;
module.exports.webpackUtil = webpackUtil;
module.exports.migrations = migrationUtil;
module.exports.fs = fs;

module.exports.join = Path.join;

module.exports.projectRoot = Path.join(__dirname, '../../');
module.exports.packageRoot = package => getPackageRoot(package);
module.exports.packageVersion = async package =>
  await fs.getVersion(Path.join(getPackageRoot(package), 'package.json'));

module.exports.build = {
  //projectRoot: Path.join(__dirname, '../../'),
  //packageRoot: (package) => getPackageRoot(package),
  //packageVersion: async (package) => await fs.getVersion(Path.join(getPackageRoot(package), 'package.json')),
  clientBuildDir: Path.join(getPackageRoot('desktop-client'), 'build'),
  clientWorkerDir: Path.join(getPackageRoot('desktop-client'), 'public/kcab'),
  clientDataDir: Path.join(getPackageRoot('desktop-client'), 'public/data'),
  clientRoot: getPackageRoot('desktop-client'),
  clientDataIndexFileName: Path.join(
    getPackageRoot('desktop-client'),
    'public/data-file-index.txt',
  ),
  workerBuildDir: Path.join(getPackageRoot('loot-core'), 'lib-dist/browser'),
  workerRoot: getPackageRoot('loot-core'),
  desktopBuildDir: Path.join(
    getPackageRoot('desktop-electron'),
    'client-build',
  ),
  workerFileHash: async () => {
    return webpackUtil.getWorkerFileHash(
      Path.join(getPackageRoot('desktop-client'), 'public/kcab'),
    );
  },
};

function getPackageRoot(packageName) {
  return Path.join(__dirname, '../../packages', packageName);
}
