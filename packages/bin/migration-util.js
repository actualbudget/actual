const { join } = require('path');

const fs = require('./fs-util');

exports.copy = async (sourceDir, destDir) => {
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

exports.createIndexFile = async (dataDir) => {
  let files = await fs.findFiles(dataDir, '**', true);
  return fs.writeFile(join(dataDir, '../data-file-index.txt'), files.sort().join('\n'));
}
