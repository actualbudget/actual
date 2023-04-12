import * as fs from 'fs';
import * as path from 'path';

import type * as T from '.';

let documentDir;

let rootPath = path.join(__dirname, '..', '..', '..', '..');

if (__filename.match('bundle')) {
  // The file name is not our filename and indicates that we're in the
  // bundled form. Because of this, the root path is different.
  rootPath = path.join(__dirname, '..');
}

export const init = () => {
  // Nothing to do
};

export const getDataDir = () => {
  if (!process.env.ACTUAL_DATA_DIR) {
    throw new Error('ACTUAL_DATA_DIR env variable is required');
  }
  return process.env.ACTUAL_DATA_DIR;
};

export const _setDocumentDir = dir => (documentDir = dir);

export const getDocumentDir = () => {
  if (!documentDir) {
    throw new Error('Document directory is not set');
  }
  return documentDir;
};

export const getBudgetDir = id => {
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
      `Invalid budget id “${id}”. Check the id of your budget in the Advanced section of the settings page.`,
    );
  }

  return path.join(getDocumentDir(), id);
};

export const bundledDatabasePath = path.join(rootPath, 'default-db.sqlite');

export const migrationsPath = path.join(rootPath, 'migrations');

export const demoBudgetPath = path.join(rootPath, 'demo-budget');

export const join = path.join;

export const basename = filepath => path.basename(filepath);

export const listDir: T.ListDir = filepath =>
  new Promise((resolve, reject) => {
    fs.readdir(filepath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

export const exists = filepath =>
  new Promise(resolve => {
    fs.access(filepath, fs.constants.F_OK, err => {
      return resolve(!err);
    });
  });

export const mkdir = filepath =>
  new Promise((resolve, reject) => {
    fs.mkdir(filepath, err => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });

export const size = filepath =>
  new Promise((resolve, reject) => {
    fs.stat(filepath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats.size);
      }
    });
  });

export const copyFile = (frompath, topath) => {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(frompath);
    const writeStream = fs.createWriteStream(topath);

    readStream.on('error', reject);
    writeStream.on('error', reject);

    writeStream.on('open', () => readStream.pipe(writeStream));
    writeStream.once('close', resolve);
  });
};

export const readFile: T.ReadFile = (filepath, encoding = 'utf8') => {
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
};

export const writeFile: T.WriteFile = (filepath, contents) => {
  return new Promise(function (resolve, reject) {
    // @ts-expect-error contents type needs refining
    fs.writeFile(filepath, contents, 'utf8', function (err) {
      return err ? reject(err) : resolve(undefined);
    });
  });
};

export const removeFile = filepath => {
  return new Promise(function (resolve, reject) {
    fs.unlink(filepath, err => {
      return err ? reject(err) : resolve(undefined);
    });
  });
};

export const removeDir = dirpath => {
  return new Promise(function (resolve, reject) {
    fs.rmdir(dirpath, err => {
      return err ? reject(err) : resolve(undefined);
    });
  });
};

export const removeDirRecursively = async dirpath => {
  if (await exists(dirpath)) {
    for (let file of await listDir(dirpath)) {
      const fullpath = join(dirpath, file);
      if (fs.statSync(fullpath).isDirectory()) {
        await removeDirRecursively(fullpath);
      } else {
        await removeFile(fullpath);
      }
    }

    await removeDir(dirpath);
  }
};

export const getModifiedTime = filepath => {
  return new Promise(function (resolve, reject) {
    fs.stat(filepath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(new Date(stats.mtime));
      }
    });
  });
};
