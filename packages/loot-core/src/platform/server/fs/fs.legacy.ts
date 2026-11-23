// @ts-strict-ignore
import { SQLiteFS } from 'absurd-sql';
import IndexedDBBackend from 'absurd-sql/dist/indexeddb-backend';

import * as connection from '#platform/server/connection';
import { join } from '#platform/server/fs/path-join';
import * as idb from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import { _getModule } from '#platform/server/sqlite';
import type { SqlJsModule } from '#platform/server/sqlite';
import {
  BudgetInUseError,
  StorageUnavailableError,
} from '#platform/server/sqlite/storage/errors';
import { getSqliteFileRow } from '#platform/server/sqlite/storage/files-store';
import {
  acquireWebLock,
  BUDGET_LOCK_TIMEOUT_MS,
  budgetLockName,
} from '#platform/server/sqlite/storage/locks';

import { _setDocumentDir as _setDocumentDirShared } from './shared';
import { pathToId } from './web-paths';

// Legacy web filesystem: Emscripten MEMFS from sql.js with sqlite files
// mounted on absurd-sql's IndexedDB block store. Kept verbatim behind the
// facade in `index.ts` until the sqlite-wasm storage becomes the default.

export { pathToId };

let FS: SqlJsModule['FS'] = null;
let BFS = null;
const NO_PERSIST = false;

export const bundledDatabasePath: string = '/default-db.sqlite';
export const migrationsPath: string = '/migrations';
export const demoBudgetPath: string = '/demo-budget';
export { join };
export { getDocumentDir, getBudgetDir } from './shared';
export const getDataDir = () => process.env.ACTUAL_DATA_DIR;

// The active document dir is persisted alongside the built-in /documents
let customPersistedRoot: string | null = null;

function normalizePath(filepath: string): string {
  const absolute = filepath.startsWith('/') ? filepath : '/' + filepath;
  let end = absolute.length;
  while (end > 0 && absolute[end - 1] === '/') {
    end--;
  }
  return absolute.slice(0, end);
}

function isUnderRoot(path: string, root: string): boolean {
  return path === root || path.startsWith(root + '/');
}

function isPersistedPath(filepath: string): boolean {
  const path = normalizePath(filepath);
  return (
    isUnderRoot(path, '/documents') ||
    (customPersistedRoot != null && isUnderRoot(path, customPersistedRoot))
  );
}

export const _setDocumentDir = dir => {
  const normalized = typeof dir === 'string' ? normalizePath(dir) : '';
  if (normalized !== '') {
    customPersistedRoot = normalized;
    if (FS) {
      _mkdirRecursively(normalized);
    }
  }
  return _setDocumentDirShared(dir);
};

function _exists(filepath: string): boolean {
  try {
    FS.readlink(filepath);
    return true;
  } catch {}

  try {
    FS.stat(filepath);
    return true;
  } catch {}
  return false;
}

function _mkdirRecursively(dir) {
  const parts = dir.split('/').filter(str => str !== '');
  let path = '';
  for (const part of parts) {
    path += '/' + part;
    if (!_exists(path)) {
      FS.mkdir(path);
    }
  }
}

function _createPersistedFile(filepath: string) {
  if (filepath.endsWith('.sqlite')) {
    // If it doesn't exist, we need to create a symlink
    if (!_exists(filepath)) {
      FS.symlink('/blocked/' + pathToId(filepath), filepath);
    }
  } else {
    // The contents are actually stored in IndexedDB. We only write to
    // the in-memory fs to take advantage of the file hierarchy
    FS.writeFile(filepath, '!$@) this should never read !$@)');
  }
}

function _createFile(filepath: string) {
  // This can create the file. Check if it exists, if not create a
  // symlink if it's a sqlite file. Otherwise store in idb

  if (!NO_PERSIST && isPersistedPath(filepath)) {
    _createPersistedFile(filepath);
  }

  return filepath;
}

async function _readFile(
  filepath: string,
  opts: { encoding: 'utf8' },
): Promise<string>;
async function _readFile(
  filepath: string,
  opts?: { encoding: 'binary' },
): Promise<Uint8Array>;
async function _readFile(
  filepath: string,
  opts?: { encoding: 'utf8' } | { encoding: 'binary' },
): Promise<string | Uint8Array> {
  // We persist stuff in /documents, but don't need to handle sqlite
  // file specifically because those are symlinked to a separate
  // filesystem and will be handled in the BlockedFS
  if (
    !NO_PERSIST &&
    isPersistedPath(filepath) &&
    !filepath.endsWith('.sqlite')
  ) {
    if (!_exists(filepath)) {
      throw new Error('File does not exist: ' + filepath);
    }

    // Grab contents from IDB
    const { store } = idb.getStore(await idb.getDatabase(), 'files');
    const item = await idb.get(store, filepath);

    if (item == null) {
      throw new Error('File does not exist: ' + filepath);
    }

    if (opts?.encoding === 'utf8' && ArrayBuffer.isView(item.contents)) {
      return String.fromCharCode.apply(
        null,
        new Uint16Array(item.contents.buffer),
      );
    }

    return item.contents;
  } else {
    if (opts?.encoding === 'utf8') {
      return FS.readFile(resolveLink(filepath), { encoding: 'utf8' });
    } else if (opts?.encoding === 'binary') {
      return FS.readFile(resolveLink(filepath), { encoding: 'binary' });
    } else {
      return FS.readFile(resolveLink(filepath));
    }
  }
}

function resolveLink(path: string): string {
  try {
    const { node } = FS.lookupPath(path, { follow: false });
    return node.link ? FS.readlink(path) : path;
  } catch {
    return path;
  }
}

async function _writeFile(filepath: string, contents): Promise<boolean> {
  if (contents instanceof ArrayBuffer) {
    contents = new Uint8Array(contents);
  } else if (ArrayBuffer.isView(contents)) {
    contents = new Uint8Array(contents.buffer);
  }

  // We always create the file if it doesn't exist, and this function
  // setups up the file depending on its type
  _createFile(filepath);

  if (!NO_PERSIST && isPersistedPath(filepath)) {
    const isDb = filepath.endsWith('.sqlite');

    // Write to IDB
    const { store } = idb.getStore(await idb.getDatabase(), 'files');

    if (isDb) {
      // We never write the contents of the database to idb ourselves.
      // It gets handled via a symlink to the blocked fs (created by
      // `_createFile` above). However, we still need to record an
      // entry for the db file so the fs gets properly constructed on
      // startup
      await idb.set(store, { filepath, contents: '' });

      // Actually persist the data by going the FS, which will pass
      // the data through the symlink to the blocked fs. For some
      // reason we need to resolve symlinks ourselves.
      await Promise.resolve();
      FS.writeFile(resolveLink(filepath), contents);
    } else {
      await idb.set(store, { filepath, contents });
    }
  } else {
    FS.writeFile(resolveLink(filepath), contents);
  }
  return true;
}

async function _copySqlFile(
  frompath: string,
  topath: string,
): Promise<boolean> {
  _createFile(topath);

  const { store } = idb.getStore(await idb.getDatabase(), 'files');
  await idb.set(store, { filepath: topath, contents: '' });
  const fromitem = await idb.get(store, frompath);
  const fromDbPath = pathToId(fromitem.filepath);
  const toDbPath = pathToId(topath);

  const fromfile = BFS.backend.createFile(fromDbPath);
  const tofile = BFS.backend.createFile(toDbPath);

  try {
    fromfile.open();
    tofile.open();
    const fileSize = fromfile.meta.size;
    const blockSize = fromfile.meta.blockSize;

    const buffer = new ArrayBuffer(blockSize);
    const bufferView = new Uint8Array(buffer);

    for (let i = 0; i < fileSize; i += blockSize) {
      const bytesToRead = Math.min(blockSize, fileSize - i);
      fromfile.read(bufferView, 0, bytesToRead, i);
      tofile.write(bufferView, 0, bytesToRead, i);
    }
  } catch (error) {
    tofile.close();
    fromfile.close();
    await _removeFile(toDbPath);
    logger.error('Failed to copy database file', error);
    return false;
  } finally {
    tofile.close();
    fromfile.close();
  }

  return true;
}

async function _removeFile(filepath: string) {
  if (!NO_PERSIST && isPersistedPath(filepath)) {
    const isDb = filepath.endsWith('.sqlite');

    // Remove from IDB
    const { store } = idb.getStore(await idb.getDatabase(), 'files');
    await idb.del(store, filepath);

    // If this is the database, is has been symlinked and we want to
    // remove the actual contents
    if (isDb) {
      const linked = resolveLink(filepath);
      // Be resilient to fs corruption: don't throw an error by trying
      // to remove a file that doesn't exist. For some reason the db
      // file is gone? It's ok, just ignore it
      if (_exists(linked)) {
        FS.unlink(linked);
      }
    }
  }

  // Finally, remove any in-memory instance
  FS.unlink(filepath);
}

// Load files from the server that should exist by default
async function populateDefaultFilesystem() {
  const index = await (
    await fetch(process.env.PUBLIC_URL + 'data-file-index.txt')
  ).text();
  const files = index
    .split('\n')
    .map(name => name.trim())
    .filter(name => name !== '');
  const fetchFile = url => fetch(url).then(res => res.arrayBuffer());

  // This is hardcoded. We know we must create the migrations
  // directory, it's not worth complicating the index to support
  // creating arbitrary folders.
  await mkdir('/migrations');
  await mkdir('/demo-budget');

  await Promise.all(
    files.map(async file => {
      const contents = await fetchFile(process.env.PUBLIC_URL + 'data/' + file);
      // `.data` lets shipped JS files escape bundler import-analysis.
      await _writeFile('/' + file.replace(/\.data$/, ''), contents);
    }),
  );
}

const populateFileHierarchy = async function () {
  const { store } = idb.getStore(await idb.getDatabase(), 'files');
  const req = store.getAllKeys();
  const paths: string[] = await new Promise((resolve, reject) => {
    // @ts-expect-error fix me
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e);
  });

  for (const path of paths) {
    _mkdirRecursively(basename(path));
    _createPersistedFile(path);
  }
};

export const init = async function () {
  const Module = _getModule();
  FS = Module.FS;

  // When a user "uploads" a file, we just put it in memory in this
  // dir and the backend takes it from there
  FS.mkdir('/uploads');

  // Files in /documents are actually read/written from idb.
  // Everything in there is automatically persisted
  FS.mkdir('/documents');

  // Files in /blocked are handled by the BlockedFS, which is a
  // special fs that persists files in blocks. This is necessary
  // for sqlite3
  FS.mkdir('/blocked');

  // Jest doesn't support workers. Right now we disable the blocked fs
  // backend under testing and just test that the directory structure
  // is created correctly. We assume the the absurd-sql project tests
  // the blocked fs enough. Additionally, we don't populate the
  // default files in testing.
  if (process.env.NODE_ENV !== 'test') {
    const backend = new IndexedDBBackend(() => {
      connection.send('fallback-write-error');
    });
    BFS = new SQLiteFS(FS, backend);
    Module.register_for_idb(BFS);

    FS.mount(BFS, {}, '/blocked');

    await populateDefaultFilesystem();
  }

  await populateFileHierarchy();
};

export const basename = function (filepath) {
  const parts = filepath.split('/');
  return parts.slice(0, -1).join('/');
};

export const listDir = async function (filepath) {
  const paths = FS.readdir(filepath);
  return paths.filter(p => p !== '.' && p !== '..');
};

export const exists = async function (filepath) {
  return _exists(filepath);
};

export const mkdir = async function (filepath) {
  FS.mkdir(filepath);
};

export const size = async function (filepath) {
  const attrs = FS.stat(resolveLink(filepath));
  return attrs.size;
};

const _copyFile = async function (
  frompath: string,
  topath: string,
): Promise<boolean> {
  let result = false;
  try {
    const contents = await _readFile(frompath);
    result = await _writeFile(topath, contents);
  } catch (error) {
    if (frompath.endsWith('.sqlite') || topath.endsWith('.sqlite')) {
      try {
        result = await _copySqlFile(frompath, topath);
      } catch (secondError) {
        throw new Error(
          `Failed to copy SQL file from ${frompath} to ${topath}: ${secondError.message}`,
        );
      }
    } else {
      throw error;
    }
  }
  return result;
};

export async function readFile(
  filepath: string,
  encoding?: 'utf8',
): Promise<string>;
export async function readFile(
  filepath: string,
  encoding: 'binary',
): Promise<Uint8Array>;
export async function readFile(
  filepath: string,
  encoding: 'binary' | 'utf8' = 'utf8',
) {
  if (encoding === 'utf8') {
    return _readFile(filepath, { encoding });
  }

  return _readFile(filepath, { encoding });
}

// A budget another worker moved to the new storage is out of bounds for
// this engine: its row marks the move
async function assertNotMoved(filepath: string) {
  if ((await getSqliteFileRow(filepath))?.storage) {
    throw new StorageUnavailableError(
      `${filepath} has moved to the new storage; reload to use it`,
    );
  }
}

// The shared budget lock, which a move cannot take while held
function lockBudget(filepath: string): Promise<() => void> {
  return acquireWebLock(
    budgetLockName(filepath),
    BUDGET_LOCK_TIMEOUT_MS,
    'shared',
  ).catch(() => {
    throw new BudgetInUseError(filepath, 'the storage lock could not be taken');
  });
}

// Changes to a database happen under the shared budget lock, so a move
// cannot land midway, and only while the budget is still this engine's
async function guardDatabase<T>(
  filepath: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!filepath.endsWith('.sqlite')) {
    return operation();
  }
  const releaseLock = await lockBudget(filepath);
  try {
    await assertNotMoved(filepath);
    return await operation();
  } finally {
    releaseLock();
  }
}

async function listDatabases(dirpath: string): Promise<string[]> {
  const paths: string[] = [];
  for (const file of await listDir(dirpath)) {
    const fullpath = join(dirpath, file);
    if (FS.isDir(FS.stat(fullpath, true).mode)) {
      paths.push(...(await listDatabases(fullpath)));
    } else if (fullpath.endsWith('.sqlite')) {
      paths.push(fullpath);
    }
  }
  return paths;
}

export const copyFile = async function (
  frompath: string,
  topath: string,
): Promise<boolean> {
  return guardDatabase(topath, () => _copyFile(frompath, topath));
};

export const writeFile = async function (filepath: string, contents) {
  return guardDatabase(filepath, () => _writeFile(filepath, contents));
};

export const removeFile = async function (filepath: string) {
  return guardDatabase(filepath, () => _removeFile(filepath));
};

export const removeDir = async function (filepath) {
  FS.rmdir(filepath);
};

// The walk under `removeDirRecursively`: every database it meets goes
// through the removal's hold, which covers the ones found before anything
// was deleted and never requests a lock it already has, since a request
// queued behind an exclusive one waiting on that hold would not be granted
async function removeTree(
  dirpath: string,
  hold: (path: string) => Promise<void>,
) {
  for (const file of await listDir(dirpath)) {
    const fullpath = join(dirpath, file);
    // `true` here means to not follow symlinks
    if (FS.isDir(FS.stat(fullpath, true).mode)) {
      await removeTree(fullpath, hold);
    } else {
      if (fullpath.endsWith('.sqlite')) {
        await hold(fullpath);
      }
      await _removeFile(fullpath);
    }
  }
  await removeDir(dirpath);
}

export const removeDirRecursively = async function (dirpath) {
  if (await exists(dirpath)) {
    // Every budget in the tree is held for the whole removal, so a move
    // cannot land midway, and every database is checked before the first
    // file goes, so a moved one is refused as a whole rather than half
    // deleted. A database that appears during the walk gets the same.
    const releases: (() => void)[] = [];
    const locked = new Set<string>();
    const checked = new Set<string>();
    const hold = async (path: string) => {
      if (checked.has(path)) {
        return;
      }
      const name = budgetLockName(path);
      if (!locked.has(name)) {
        locked.add(name);
        releases.push(await lockBudget(path));
      }
      await assertNotMoved(path);
      checked.add(path);
    };
    try {
      for (const path of await listDatabases(dirpath)) {
        await hold(path);
      }
      await removeTree(dirpath, hold);
    } finally {
      for (const release of releases) {
        release();
      }
    }
  }
};

export const getModifiedTime = async (_filepath: string): Promise<Date> => {
  throw new Error(
    'getModifiedTime not supported on the web (only used for backups)',
  );
};
