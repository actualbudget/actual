const Path = require('path');

const fs = require('./fs-util')

// Define useful paths and values that are shared across projects
// and may be useful in build scripts.
class BuildDefines {
  constructor(packageName) {
      this.packageName = packageName;
      this.setVars();
  }

  getPackageRoot(packageName) {
    return Path.join(__dirname, '../../packages', packageName)
  }

  async getWorkerFileHash(directory) {
    let files = await fs.findFiles(directory, 'kcab.worker.*.js', true);
    return files[0].match(/(?<=kcab\.worker\.).*(?=\.js)/)[0];
  };

  setVars() {
    this.packageRoot = this.getPackageRoot(this.packageName);
    this.projectRoot = Path.join(__dirname, '../../');
    this.workerRoot = this.getPackageRoot('loot-core');
    this.workerBuildDir = Path.join(this.workerRoot, 'lib-dist/browser');
    this.desktopRoot = this.getPackageRoot('desktop-electron');
    this.desktopBuildDir = Path.join(this.desktopRoot, 'client-build');
    this.clientRoot = this.getPackageRoot('desktop-client');
    this.clientBuildDir = Path.join(this.clientRoot, 'build');
    this.clientWorkerDir = Path.join(this.clientRoot, 'public/kcab');
    this.clientDataDir = Path.join(this.clientRoot, 'public/data');
    this.clientDataIdxFileName = Path.join(
      this.clientRoot,
      'public/data-file-index.txt',
    );

    if (process.env.NODE_ENV === 'development') {
      this.outputHash = 'dev';
    }
    else {
      this.outputHash = '[contenthash]';
    }
  }
}

module.exports = BuildDefines;
