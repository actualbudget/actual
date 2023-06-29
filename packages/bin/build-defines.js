const Path = require('path');

const webpackUtil = require('./webpack-util');

// Define useful paths and values that are shared across projects
// and may be useful in build scripts.
class BuildDefines {
  packageName;
  packageRoot;
  projectRoot;

  clientRoot;
  clientBuildDir;
  clientWorkerDir;
  clientDataDir;
  clientDataIdxFileName;

  workerRoot;
  workerBuildDir;

  desktopRoot;
  desktopBuildDir;

  outputHash;

  constructor(packageName) {
      this.packageName = packageName;
      this.setVars();
  }

  getPackageRoot(packageName) {
    return Path.join(__dirname, '../../packages', packageName)
  }

  setVars() {
    this.packageRoot = this.getPackageRoot(this.packageName);
    this.projectRoot = Path.join(__dirname, '../../');

    this.clientRoot = this.getPackageRoot('desktop-client');
    this.clientBuildDir = Path.join(this.clientRoot, 'build');
    this.clientWorkerDir = Path.join(this.clientRoot, 'public/kcab');
    this.clientDataDir = Path.join(this.clientRoot, 'public/data');
    this.clientDataIdxFileName = Path.join(
      this.clientRoot,
      'public/data-file-index.txt',
    );

    this.workerRoot = this.getPackageRoot('loot-core');
    this.workerBuildDir = Path.join(this.workerRoot, 'lib-dist/browser');

    this.desktopRoot = this.getPackageRoot('desktop-electron');
    this.desktopBuildDir = Path.join(this.desktopRoot, 'client-build');

    this.outputHash = webpackUtil.getContentHash();
  }
}

module.exports = BuildDefines;
