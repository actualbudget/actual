const Path = require('path');

const fsUtil = require('../../../bin/fs-util');

exports.copyMigrations = async (sourceDir, destDir) => {
  let destMigrationDir = Path.join(destDir, '/migrations');

  await fsUtil.rmdir(destMigrationDir);
  await fsUtil.mkdir(destMigrationDir);
  // don't copy files that start with a .
  await fsUtil.copyFiles(
    Path.join(sourceDir, '/migrations'),
    destMigrationDir,
    { ignoreHiddenFiles: true },
  );
  await fsUtil.copyFile(
    Path.join(sourceDir, '/default-db.sqlite'),
    Path.join(destDir, '/default-db.sqlite'),
  );
};
