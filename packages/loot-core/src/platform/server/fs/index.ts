import { join } from '#platform/server/fs/path-join';
import * as idb from '#platform/server/indexeddb';
import { getSqliteStore } from '#platform/server/sqlite/storage/index';

import { createMemFs } from './memfs';
import type { MemFsContents } from './memfs';
import { _setDocumentDir as _setDocumentDirShared } from './shared';
import {
  isSqlitePath,
  isUnderRoot,
  normalizePath,
  pathToId,
} from './web-paths';

// The web filesystem. The directory tree lives in memory; persisted files
// under /documents keep their contents in the IndexedDB `files` store,
// except sqlite files, which belong to the sqlite storage (OPFS, or
// IndexedDB as a whole file). Bundled data files are fetched on first read.

export const bundledDatabasePath: string = '/default-db.sqlite';
export const migrationsPath: string = '/migrations';
export const demoBudgetPath: string = '/demo-budget';
export { join };
export { getDocumentDir, getBudgetDir } from './shared';
export { pathToId };
export const getDataDir = () => process.env.ACTUAL_DATA_DIR;

const memfs = createMemFs();
// Bundled files registered at startup but fetched on first read. Their
// memfs entry is `null` until then, like a persisted file's.
const lazyFiles = new Map<string, () => Promise<Uint8Array>>();
let customPersistedRoot: string | null = null;

function isPersistedPath(filepath: string): boolean {
  const path = normalizePath(filepath);
  return (
    isUnderRoot(path, '/documents') ||
    (customPersistedRoot != null && isUnderRoot(path, customPersistedRoot))
  );
}

export const _setDocumentDir = (dir: string | null) => {
  if (dir) {
    customPersistedRoot = normalizePath(dir);
    memfs.mkdirp(customPersistedRoot);
  }
  return _setDocumentDirShared(dir);
};

function toStoredContents(
  contents: string | ArrayBuffer | Uint8Array,
): MemFsContents {
  return contents instanceof ArrayBuffer ? new Uint8Array(contents) : contents;
}

function toBytes(contents: MemFsContents): Uint8Array {
  return typeof contents === 'string'
    ? new TextEncoder().encode(contents)
    : contents;
}

function toText(contents: MemFsContents): string {
  return typeof contents === 'string'
    ? contents
    : new TextDecoder().decode(contents);
}

async function readTransient(path: string): Promise<MemFsContents> {
  const contents = memfs.readFile(path);
  if (contents === undefined) {
    throw new Error('File does not exist: ' + path);
  }
  if (contents !== null) {
    return contents;
  }
  const load = lazyFiles.get(path);
  if (!load) {
    throw new Error('File does not exist: ' + path);
  }
  const loaded = await load();
  memfs.writeFile(path, loaded);
  lazyFiles.delete(path);
  return loaded;
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
  const path = normalizePath(filepath);

  if (isPersistedPath(path)) {
    if (isSqlitePath(path)) {
      const bytes = await getSqliteStore().readFile(path);
      return opts?.encoding === 'utf8'
        ? new TextDecoder().decode(bytes)
        : bytes;
    }

    if (!memfs.exists(path)) {
      throw new Error('File does not exist: ' + path);
    }
    const { store } = idb.getStore(await idb.openDatabase(), 'files');
    const item = await idb.get(store, path);
    if (item == null) {
      throw new Error('File does not exist: ' + path);
    }
    if (opts?.encoding === 'utf8' && ArrayBuffer.isView(item.contents)) {
      // Matches the legacy filesystem: binary rows read as text are UTF-16
      return new TextDecoder('utf-16le').decode(item.contents);
    }
    return item.contents;
  }

  const contents = await readTransient(path);
  if (opts?.encoding === 'utf8') {
    return toText(contents);
  }
  if (opts?.encoding === 'binary') {
    return toBytes(contents);
  }
  return contents;
}

async function _writeFile(
  filepath: string,
  contents: string | ArrayBuffer | Uint8Array,
): Promise<boolean> {
  const path = normalizePath(filepath);
  const stored = toStoredContents(contents);

  if (isPersistedPath(path)) {
    if (isSqlitePath(path)) {
      await getSqliteStore().writeFile(path, toBytes(stored));
    } else {
      const { store } = idb.getStore(await idb.openDatabase(), 'files');
      await idb.set(store, { filepath: path, contents: stored });
    }
    // Only the hierarchy is kept in memory for persisted files
    memfs.writeFile(path, null);
  } else {
    memfs.writeFile(path, stored);
  }
  return true;
}

async function _removeFile(filepath: string) {
  const path = normalizePath(filepath);
  if (isPersistedPath(path)) {
    if (isSqlitePath(path)) {
      await getSqliteStore().removeFile(path);
    } else {
      const { store } = idb.getStore(await idb.openDatabase(), 'files');
      await idb.del(store, path);
    }
  }
  lazyFiles.delete(path);
  memfs.unlink(path);
}

// A failed fetch throws rather than hand back its error page as the
// file, so a lazy file stays registered and the next read tries again
async function fetchBundled(url: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`fetching ${url} failed: ${response.status}`);
  }
  return response;
}

// Register the bundled files (migrations, default database). They are
// fetched when first read rather than all at startup.
async function populateDefaultFilesystem() {
  const index = await (
    await fetchBundled(process.env.PUBLIC_URL + 'data-file-index.txt')
  ).text();
  const files = index
    .split('\n')
    .map(name => name.trim())
    .filter(name => name !== '');

  memfs.mkdirp(migrationsPath);
  memfs.mkdirp(demoBudgetPath);

  for (const file of files) {
    // `.data` lets shipped JS files escape bundler import-analysis.
    const path = '/' + file.replace(/\.data$/, '');
    const url = process.env.PUBLIC_URL + 'data/' + file;
    lazyFiles.set(
      path,
      async () => new Uint8Array(await (await fetchBundled(url)).arrayBuffer()),
    );
    memfs.writeFile(path, null);
  }
}

async function populateFileHierarchy() {
  const { store } = idb.getStore(await idb.openDatabase(), 'files');
  const request = store.getAllKeys();
  const paths = await new Promise<string[]>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });

  for (const path of paths) {
    memfs.writeFile(path, null);
  }
}

export const init = async function () {
  // When a user "uploads" a file, we just put it in memory in this
  // dir and the backend takes it from there
  memfs.mkdirp('/uploads');
  memfs.mkdirp('/documents');

  if (process.env.NODE_ENV !== 'test') {
    await populateDefaultFilesystem();
  }

  await populateFileHierarchy();
};

export const listDir = async function (filepath: string) {
  return memfs.readdir(filepath);
};

export const exists = async function (filepath: string) {
  return memfs.exists(filepath);
};

export const mkdir = async function (filepath: string) {
  memfs.mkdir(filepath);
};

export const copyFile = async function (
  frompath: string,
  topath: string,
): Promise<boolean> {
  try {
    const contents = await _readFile(frompath);
    return await _writeFile(topath, contents);
  } catch (error) {
    throw new Error(`Failed to copy file from ${frompath} to ${topath}`, {
      cause: error,
    });
  }
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

export const writeFile = async function (
  filepath: string,
  contents: string | ArrayBuffer | Uint8Array,
) {
  return _writeFile(filepath, contents);
};

export const removeFile = async function (filepath: string) {
  return _removeFile(filepath);
};

export const removeDir = async function (filepath: string) {
  memfs.rmdir(filepath);
};

async function listFiles(dirpath: string): Promise<string[]> {
  const paths: string[] = [];
  for (const file of await listDir(dirpath)) {
    const fullpath = join(dirpath, file);
    if (memfs.isDirectory(fullpath)) {
      paths.push(...(await listFiles(fullpath)));
    } else {
      paths.push(fullpath);
    }
  }
  return paths;
}

// Removes what is left once the databases are gone from the sqlite
// storage: their entries, and every other file
async function removeTree(dirpath: string, removed: Set<string>) {
  for (const file of await listDir(dirpath)) {
    const fullpath = join(dirpath, file);
    if (memfs.isDirectory(fullpath)) {
      await removeTree(fullpath, removed);
    } else if (removed.has(fullpath)) {
      memfs.unlink(fullpath);
    } else {
      await removeFile(fullpath);
    }
  }
  await removeDir(dirpath);
}

export const removeDirRecursively = async function (dirpath: string) {
  if (await exists(dirpath)) {
    // The databases go first and together: the sqlite storage locks and
    // checks every budget involved before deleting any, so a refusal or a
    // budget open elsewhere leaves the tree, backups included, as it was
    const databases = (await listFiles(dirpath)).filter(
      path => isPersistedPath(path) && isSqlitePath(path),
    );
    await getSqliteStore().removeFiles(databases);
    await removeTree(dirpath, new Set(databases));
  }
};

export const getModifiedTime = async (_filepath: string): Promise<Date> => {
  throw new Error(
    'getModifiedTime not supported on the web (only used for backups)',
  );
};
