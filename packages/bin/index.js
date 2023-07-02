const Path = require('path');

const BuildDefines = require('./build-defines');
const fs = require('./fs-util');
const migrationUtil = require('./migration-util');
const shellUtil = require('./shell-util');

class BuildScript extends BuildDefines {
  fs = fs;
  migrations = migrationUtil;
  join = Path.join;
  exec = shellUtil.exec;

  constructor(packageName, buildRunnable) {
    super(packageName);
    this.buildRunnable = buildRunnable;
    // set working dir
    process.chdir(this.packageRoot);
  }

  async run() {
    console.time('run');
    await this.buildRunnable();
    console.timeEnd('run');
  }
}

module.exports = BuildScript;
