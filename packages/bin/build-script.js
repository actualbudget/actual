const Path = require('path');

const BuildDefines = require('./build-defines');
const fs = require('./fs-util');
const migrationUtil = require('./migration-util');
const shellUtil = require('./shell-util');
const webpackUtil = require('./webpack-util');

class BuildScript extends BuildDefines {
  // re-export methods to reduce build script 'requires'
  fs = fs;
  migrations = migrationUtil;
  join = Path.join;
  exec = shellUtil.exec;

  constructor(packageName, buildRunnable) {
    super(packageName);
    this.buildRunnable = buildRunnable;

    process.chdir(this.packageRoot);
  }

  // Run the build script (with some handy timing info)
  async run() {
    console.time('run');
    await this.buildRunnable();
    console.timeEnd('run');
  }

  // Get the version from package.json of the current project.
  async packageVersion() {
    return fs.getVersion(Path.join(this.packageRoot, 'package.json'));
  }

  // Gets the hash for the built worker file.
  // won't work if called before the file exists.
  async getWorkerFileHash() {
    return webpackUtil.getWorkerFileHash(
      Path.join(this.clientRoot, 'public/kcab'),
    );
  }
}

module.exports = BuildScript;
