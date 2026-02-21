// @ts-strict-ignore
import * as fs from 'fs';
import * as path from 'path';

import promiseRetry from 'promise-retry';

import { logger } from '../log';

import type * as T from './index';

export { getDocumentDir, getBudgetDir, _setDocumentDir } from './shared';

let rootPath = path.join(__dirname, '..', '..', '..', '..');

switch (path.basename(__filename)) {
  case 'bundle.api.js': // api bundle uses the electron bundle - account for its file structure
    rootPath = path.join(__dirname, '..');
    break;
  case 'bundle.desktop.js': // electron app
    rootPath = path.join(__dirname, '..', '..');
    break;
  default:
    break;
}

export const init: typeof T.init = async () => {
  // Nothing to do
};

export const getDataDir: typeof T.getDataDir = () => {
  if (!process.env.ACTUAL_DATA_DIR) {
    throw new Error('ACTUAL_DATA_DIR env variable is required');
  }
  return process.env.ACTUAL_DATA_DIR;
};

export const bundledDatabasePath: typeof T.bundledDatabasePath = path.join(
  rootPath,
  'default-db.sqlite',
);

export const migrationsPath: typeof T.migrationsPath = path.join(
  rootPath,
  'migrations',
);

export const demoBudgetPath: typeof T.demoBudgetPath = path.join(
  rootPath,
  'demo-budget',
);

export const join: typeof T.join = path.join;

export const basename: typeof T.basename = filepath => path.basename(filepath);

export const listDir: typeof T.listDir = filepath =>
  new Promise((resolve, reject) => {
    fs.readdir(filepath, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

export const exists: typeof T.exists = filepath =>
  new Promise(resolve => {
    fs.access(filepath, fs.constants.F_OK, err => {
      return resolve(!err);
    });
  });

export const mkdir: typeof T.mkdir = filepath =>
  new Promise((resolve, reject) => {
    fs.mkdir(filepath, err => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });

export const size: typeof T.size = filepath =>
  new Promise((resolve, reject) => {
    fs.stat(filepath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats.size);
      }
    });
  });

export const copyFile: typeof T.copyFile = (frompath, topath) => {
  return new Promise<boolean>((resolve, reject) => {
    const readStream = fs.createReadStream(frompath);
    const writeStream = fs.createWriteStream(topath);

    readStream.on('error', reject);
    writeStream.on('error', reject);

    writeStream.on('open', () => readStream.pipe(writeStream));
    writeStream.once('close', () => resolve(true));
  });
};

export const readFile: typeof T.readFile = (
  filepath: string,
  encoding: 'utf8' | 'binary' | null = 'utf8',
) => {
  if (encoding === 'binary') {
    // `binary` is not actually a valid encoding, you pass `null` into node if
    // you want a buffer
    encoding = null;
  }
  // `any` as cannot refine return with two function overrides
  // oxlint-disable-next-line typescript/no-explicit-any
  return new Promise<any>((resolve, reject) => {
    fs.readFile(filepath, encoding, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

export const writeFile: typeof T.writeFile = async (filepath, contents) => {
  try {
    await promiseRetry(
      (retry, attempt) => {
        return new Promise((resolve, reject) => {
          fs.writeFile(filepath, contents, 'utf8', err => {
            if (err) {
              logger.error(
                `Failed to write to ${filepath}. Attempted ${attempt} times. Something is locking the file - potentially a virus scanner or backup software.`,
              );
              reject(err);
            } else {
              if (attempt > 1) {
                logger.info(
                  `Successfully recovered from file lock. It took ${attempt} retries`,
                );
              }
              resolve(undefined);
            }
          });
        }).catch(retry);
      },
      {
        retries: 20,
        minTimeout: 100,
        maxTimeout: 500,
        factor: 1.5,
      },
    );

    return undefined;
  } catch (err) {
    logger.error(`Unable to recover from file lock on file ${filepath}`);
    throw err;
  }
};

export const removeFile: typeof T.removeFile = filepath => {
  return new Promise(function (resolve, reject) {
    fs.unlink(filepath, err => {
      return err ? reject(err) : resolve(undefined);
    });
  });
};

export const removeDir: typeof T.removeDir = dirpath => {
  return new Promise(function (resolve, reject) {
    fs.rmdir(dirpath, err => {
      return err ? reject(err) : resolve(undefined);
    });
  });
};

export const removeDirRecursively: typeof T.removeDirRecursively =
  async dirpath => {
    if (await exists(dirpath)) {
      for (const file of await listDir(dirpath)) {
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

export const getModifiedTime: typeof T.getModifiedTime = filepath => {
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
