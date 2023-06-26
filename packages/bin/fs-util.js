const fs = require('fs-extra')
const Path = require('path');
const fg = require('fast-glob');

module.exports = class FsUtil {
  static async copyFileToFolder(file, dest) {
    await fs.copyFile(file, Path.join(dest, Path.parse(file).base));
  }

  static async rmdir(dir) {
      await fs.rm(dir, { recursive: true, force: true });
  }

  static async findFiles(directory, pattern, relativePath=false) {
    if (relativePath) {
       return fg(pattern, { cwd: directory, absolute: false });
    }
    return fg(pattern, { cwd: directory, absolute: true });
  }

  static async removeFiles(pattern) {
    let files = await fg(pattern);
    await Promise.all(files.map(file => fs.unlink(files)));
  }

  static async getVersion(packageJsonPath) {
    const data = await fs.readFile(packageJsonPath);
    const json = JSON.parse(data);
    return json.version;
  }
}