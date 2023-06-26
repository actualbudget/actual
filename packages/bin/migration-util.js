const fsUtil = require('./fs-util');
const { join } = require('path')
const fs = require('fs-extra')

exports.copyMigrations = async (sourceDir, destDir) => {
  let destMigrationDir = join(destDir, 'migrations');

  await fs.ensureDir(destDir);
  await fs.emptyDir(destMigrationDir);
  
  let srcMigrationPath = join(sourceDir, 'migrations' );
  
  // don't copy files that start with a .
  let files = await fsUtil.findFiles( srcMigrationPath, '**', false);

  await Promise.all(files.map(file => fsUtil.copyFileToFolder(file, destMigrationDir)));
  await fsUtil.copyFileToFolder(join(sourceDir, 'default-db.sqlite'), destDir);
};
