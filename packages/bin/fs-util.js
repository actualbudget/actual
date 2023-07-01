const Path = require('path');

const fg = require('fast-glob');
var fs = require('fs-extra');

// deprecated in favour of rm but its cleaner to not need caller
// to pass the force & recursive params each time
delete fs['rmdir'];

fs.rmdir = async dir => {
  await fs.rm(dir, { recursive: true, force: true });
};

fs.copyFileToFolder = async (file, dest) => {
  await fs.copyFile(file, Path.join(dest, Path.parse(file).base));
};

fs.findFiles = async (directory, pattern, relativePath = false) => {
  return fg(pattern, { cwd: directory, absolute: !relativePath });
};

fs.removeFiles = async pattern => {
  let files = await fg(pattern);
  return Promise.all(files.map(file => fs.unlink(file)));
};

module.exports = fs;
