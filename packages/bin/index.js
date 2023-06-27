const fsUtil = require('./fs-util');
const webpackUtil = require('./webpack-util');
const shellUtil = require('./shell-util');
const migrationUtil = require('./migration-util');

const Path = require('path');
const fs = require('fs-extra');

module.exports.fsUtil = fsUtil;
module.exports.shellUtil = shellUtil;
module.exports.webpackUtil = webpackUtil;
module.exports.migrationUtil = migrationUtil;

module.exports.fs = fs;
module.exports.join = Path.join;

module.exports.projectRoot = Path.join(__dirname, '../../');
module.exports.packageRoot = (package) => getPackageRoot(package);
module.exports.packageVersion = async (package) => await fsUtil.getVersion(Path.join(getPackageRoot(package), 'package.json'));

module.exports.build = {
    //projectRoot: Path.join(__dirname, '../../'),
    //packageRoot: (package) => getPackageRoot(package),
    //packageVersion: async (package) => await fsUtil.getVersion(Path.join(getPackageRoot(package), 'package.json')),
    clientBuildDir: Path.join(getPackageRoot('desktop-client'), 'build'),
    clientWorkerDir: Path.join(getPackageRoot('desktop-client'), 'public/kcab'),
    clientDataDir: Path.join(getPackageRoot('desktop-client'), 'public/data'),
    clientRoot: getPackageRoot('desktop-client'),
    clientDataIndexFileName: Path.join(getPackageRoot('desktop-client'), 'public/data-file-index.txt'),
    workerBuildDir: Path.join(getPackageRoot('loot-core'), 'lib-dist/browser'),
    workerRoot: getPackageRoot('loot-core'),
    desktopBuildDir: Path.join(getPackageRoot('desktop-electron'), 'client-build')
}

function getPackageRoot(packageName) {
    return Path.join( __dirname, '../../packages', packageName);
}