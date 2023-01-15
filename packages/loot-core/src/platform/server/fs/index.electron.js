const fs = require('fs');
const path = require('path');

let documentDir;

let rootPath = path.join(__dirname, '..', '..', '..', '..');

if (__filename.match('bundle')) {
  // The file name is not our filename and indicates that we're in the
  // bundled form. Because of this, the root path is different.
  rootPath = path.join(__dirname, '..');
}

module.exports = {
  init: () => {
    // Nothing to do
  },
  getDataDir: () => {
    if (!process.env.ACTUAL_DATA_DIR) {
      throw new Error('ACTUAL_DATA_DIR env variable is required');
    }
    return process.env.ACTUAL_DATA_DIR;
  },
  _setDocumentDir: dir => (documentDir = dir),
  getDocumentDir: () => {
    if (!documentDir) {
      throw new Error('Document directory is not set');
    }
    return documentDir;
  },
  getBudgetDir: id => {
    if (!id) {
      throw new Error('getDocumentDir: id is falsy: ' + id);
    }

    // TODO: This should be better
    //
    // A cheesy safe guard. The id is generated from the budget name,
    // so it provides an entry point for the user to accidentally (or
    // intentionally) access other parts of the system. Always
    // restrict it to only access files within the budget directory by
    // never allowing slashes.
    if (id.match(/[^A-Za-z0-9\-_]/)) {
      throw new Error(
        `Invalid budget id "${id}". Check the id of your budget in the "Advanced" section of the settings page.`
      );
    }

    return path.join(module.exports.getDocumentDir(), id);
  },
  bundledDatabasePath: path.join(rootPath, 'default-db.sqlite'),
  migrationsPath: path.join(rootPath, 'migrations'),
  demoBudgetPath: path.join(rootPath, 'demo-budget'),
  join: path.join,
  basename: filepath => path.basename(filepath),
  listDir: filepath =>
    new Promise((resolve, reject) => {
      fs.readdir(filepath, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files);
        }
      });
    }),
  exists: filepath =>
    new Promise(resolve => {
      fs.access(filepath, fs.constants.F_OK, err => {
        return resolve(!err);
      });
    }),
  mkdir: filepath =>
    new Promise((resolve, reject) => {
      fs.mkdir(filepath, err => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    }),
  size: filepath =>
    new Promise((resolve, reject) => {
      fs.stat(filepath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats.size);
        }
      });
    }),
  copyFile: (frompath, topath) => {
    return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(frompath);
      const writeStream = fs.createWriteStream(topath);

      readStream.on('error', reject);
      writeStream.on('error', reject);

      writeStream.on('open', () => readStream.pipe(writeStream));
      writeStream.once('close', resolve);
    });
  },
  readFile: (filepath, encoding = 'utf8') => {
    if (encoding === 'binary') {
      // `binary` is not actually a valid encoding, you pass `null` into node if
      // you want a buffer
      encoding = null;
    }
    return new Promise((resolve, reject) => {
      fs.readFile(filepath, encoding, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  },
  writeFile: (filepath, contents) => {
    return new Promise(function (resolve, reject) {
      fs.writeFile(filepath, contents, 'utf8', function (err, _) {
        return err ? reject(err) : resolve();
      });
    });
  },
  removeFile: filepath => {
    return new Promise(function (resolve, reject) {
      fs.unlink(filepath, err => {
        return err ? reject(err) : resolve();
      });
    });
  },
  removeDir: dirpath => {
    return new Promise(function (resolve, reject) {
      fs.rmdir(dirpath, err => {
        return err ? reject(err) : resolve();
      });
    });
  },
  removeDirRecursively: async dirpath => {
    const f = module.exports;
    if (await f.exists(dirpath)) {
      for (let file of await f.listDir(dirpath)) {
        const fullpath = f.join(dirpath, file);
        if (fs.statSync(fullpath).isDirectory()) {
          await f.removeDirRecursively(fullpath);
        } else {
          await f.removeFile(fullpath);
        }
      }

      await f.removeDir(dirpath);
    }
  },
  getModifiedTime: filepath => {
    return new Promise(function (resolve, reject) {
      fs.stat(filepath, (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(new Date(stats.mtime));
        }
      });
    });
  }
};
