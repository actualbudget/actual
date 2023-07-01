const Path = require('path');

const fs = require('./fs-util')

// Define useful paths and values that are shared across projects
// and may be useful in build scripts.
class BuildDefines {
  constructor(packageName) {
      this.packageName = packageName;
      this.packageRoot = this.getPackageRoot(this.packageName);
      this.projectRoot = Path.join(__dirname, '../../');
      this.workerRoot = this.getPackageRoot('loot-core');
      this.workerBuildDir = Path.join(this.workerRoot, 'lib-dist/browser');
      this.clientRoot = this.getPackageRoot('desktop-client');
      this.clientBuildDir = Path.join(this.clientRoot, 'build');
      this.clientWorkerDir = Path.join(this.clientRoot, 'public/kcab');
      this.clientDataDir = Path.join(this.clientRoot, 'public/data');
      this.clientDataIdxFilePath = Path.join(
        this.clientRoot,
        'public/data-file-index.txt',
      );
      this.isDev = process.env.NODE_ENV === 'development';
      this.isProduction = process.env.NODE_ENV === 'production';
      this.outputHash = this.isDev ?'dev' : '[contenthash]';
  }

  getPackageRoot(packageName) {
    return Path.join(__dirname, '../../packages', packageName)
  }

  async getWorkerFileHash() {
    let files = await fs.findFiles(this.clientWorkerDir, 'kcab.worker.*.js', true);
    return files[0].match(/(?<=kcab\.worker\.).*(?=\.js)/)[0];
  };
}

module.exports = BuildDefines;
