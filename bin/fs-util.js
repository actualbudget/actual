const fs = require('fs/promises')
const Path = require('path');

module.exports = class FsUtil {
  static async copyFile(src, dest) {
    await fs.copyFile(src, dest);
  }

  static async rmdir(dir) {
    try {
      await fs.rm(dir, { recursive: true });
    } catch(err) {
      // don't care if doesn't exist
      if (err.code != 'ENOENT') {
        throw err;
      }
    }
  }

  static async mkdir(dir) {
    try {
      await fs.mkdir(dir);
    } catch (err) {
      // don't care if it already exists
      if (err.code != 'EEXIST') {
        throw err;
      }
    }
    
    await fs.chmod(dir, 666);
  }

  static async copyFiles(src, dest, { includeSubDirs = false, ignoreHiddenFiles = false } = {}) {
    const files = await FsUtil.listFiles(src, {includeSubDirs: includeSubDirs, ignoreHiddenFiles: ignoreHiddenFiles});

    var promises = files.map( async (file) =>{
      await fs.copyFile(file, Path.join(dest, Path.parse(file).base));
      await fs.chmod(Path.join(dest, Path.parse(file).base), 644);
    });
    return await Promise.all(promises);
  }

  static async listFiles(directory, {includeSubDirs = false, ignoreHiddenFiles = false, excludeRootDir = false} = {}) {
    let files = [];
    if (ignoreHiddenFiles) {
      const regex = new RegExp( /^[^.].*/ );
      files = await readDirRecurse(directory, includeSubDirs, regex);
    } else {
      files = await readDirRecurse(directory, includeSubDirs);
    }

    if (excludeRootDir) {
      files = files
        .map((file) => file.replace(directory, ''))
        .map((file) => FsUtil.removeFromStart(file, '\\'))
        .map((file) => FsUtil.removeFromStart(file, '//'))
    }

    return files.map((file) => FsUtil.sanitise(file));
  }

  static async findFiles(directory, regex) {
    let files = await FsUtil.listFiles(directory, {excludeRootDir: true});
    return files.filter( (file) => file.match(regex) != null);
  }

  static sanitise(filepath) {
     return filepath.replaceAll('\\', Path.sep).replaceAll('/', Path.sep);
  }

  static removeFromStart(str, arg) {
    if (str.startsWith(arg)) {
      return str.slice(arg.length);
    }
    return str;
  }

  static async writeStringArrayToFile(arr, dest) {
    let data = ''
    arr.forEach( function(line) {
      data += (line + '\n');
    })

    await fs.writeFile(dest, data);
  }

  static async emptyDir(directory, regex=null) {
    if (regex == null) {
      fs.rm(directory, {recursive: true, force: true});
      FsUtil.mkdir(directory);
    } else {
      let files = await FsUtil.listFiles(directory);
      files = files.filter( (file) => file.matches(regex));
      await Promise.all(files.map(file => fs.unlink(file)));
      // delete and remaining directories that match
      let dirs = await fs.readdir(directory);
      await Promise.all(
        dirs.filter(dirent => dirent.isDirectory())
          .filter(dirent => dirent.matches(regex))
          .map(dirent => Path.join(directory, dirent.name))
          .map(file => FsUtil.rmdir(file))
      );
    }
  }

  static async createSymlink(src, dest) {
    try {
      await fs.unlink(dest);
    } catch (err) {
      // if the file isn't already linked this will fail
      // we are not interested.
    }
    await fs.symlink(src, dest, 'dir');
  }

  static async getVersion(packageJsonPath) {
    const data = await fs.readFile(packageJsonPath);
    const json = JSON.parse(data);
    return json.version;
  }
}

async function readDirRecurse(directory, recurse, fileNameRegex = null) {
  const dirents = await fs.readdir( directory, { withFileTypes: true});
  const paths = [];

  if (recurse) {
    var promises = dirents.map(async (dirent) => {
      if (dirent.isDirectory()) {
        let innerPath = await readDirRecurse(Path.join(directory, dirent.name), recurse);
        paths.push(...innerPath);
      }
    });

    await Promise.all(promises);
  }

  await paths.push(...dirents
    .filter(dirent => dirent.isFile())
    .filter(dirent => fileNameRegex == null ? true : fileNameRegex.test(dirent.name))
    .map(dirent => Path.join(directory, dirent.name)));

  return await paths;
}