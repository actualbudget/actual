const { join } = require('path');

const fs = require('./fs-util');

exports.copyMigrations = async (sourceDir, destDir) => {
  let destMigrationDir = join(destDir, 'migrations');

  await fs.ensureDir(destDir);
  await fs.emptyDir(destMigrationDir);

  let srcMigrationPath = join(sourceDir, 'migrations');

  // don't copy files that start with a '.'
  let files = await fs.findFiles(srcMigrationPath, '**', false);

  await Promise.all(
    files.map(file => fs.copyFileToFolder(file, destMigrationDir)),
  );
  await fs.copyFileToFolder(join(sourceDir, 'default-db.sqlite'), destDir);
};
