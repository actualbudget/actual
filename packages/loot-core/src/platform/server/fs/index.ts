// @ts-strict-ignore
import * as idb from '../indexeddb';
import { logger } from '../log';
import { _getSAHPoolUtil } from '../sqlite';

import { join } from './path-join';

// ---------------------------------------------------------------------------
// Simple in-memory filesystem tree
// ---------------------------------------------------------------------------
// Replaces the Emscripten FS that was previously provided by sql.js.
// Non-SQLite files in /documents are persisted in IndexedDB.
// SQLite (.sqlite) files in /documents are persisted via the OPFS SAH Pool
// VFS managed by @sqlite.org/sqlite-wasm.
// All other files (migrations, demo-budget, uploads, etc.) are in-memory only.
// ---------------------------------------------------------------------------

const knownDirs = new Set<string>();
const memFiles = new Map<string, Uint8Array | string>();
// Tracks every known file path (both in-memory and IDB-backed)
const trackedFiles = new Set<string>();

function _resetFS() {
  knownDirs.clear();
  memFiles.clear();
  trackedFiles.clear();
}

export const bundledDatabasePath: string = '/default-db.sqlite';
export const migrationsPath: string = '/migrations';
export const demoBudgetPath: string = '/demo-budget';
export { join };
export { getDocumentDir, getBudgetDir, _setDocumentDir } from './shared';
export const getDataDir = () => process.env.ACTUAL_DATA_DIR;

export const pathToId = function (filepath: string): string {
  return filepath.replace(/^\//, '').replace(/\//g, '-');
};

function _exists(filepath: string): boolean {
  return knownDirs.has(filepath) || trackedFiles.has(filepath);
}

function _mkdirRecursively(dir: string) {
  const parts = dir.split('/').filter(str => str !== '');
  let path = '';
  for (const part of parts) {
    path += '/' + part;
    if (!knownDirs.has(path)) {
      knownDirs.add(path);
    }
  }
}

function _trackFile(filepath: string) {
  trackedFiles.add(filepath);
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
  // Persistent non-SQLite files under /documents live in IndexedDB
  if (filepath.startsWith('/documents') && !filepath.endsWith('.sqlite')) {
    if (!_exists(filepath)) {
      throw new Error('File does not exist: ' + filepath);
    }

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
  }

  // Everything else is in-memory
  const contents = memFiles.get(filepath);
  if (contents === undefined) {
    throw new Error('File does not exist: ' + filepath);
  }

  if (opts?.encoding === 'utf8') {
    if (typeof contents === 'string') {
      return contents;
    }
    return new TextDecoder().decode(contents);
  }

  if (typeof contents === 'string') {
    return new TextEncoder().encode(contents);
  }
  return contents;
}

async function _writeFile(
  filepath: string,
  contents: string | ArrayBuffer | Uint8Array | ArrayBufferView,
): Promise<boolean> {
  let normalized: string | Uint8Array;
  if (contents instanceof ArrayBuffer) {
    normalized = new Uint8Array(contents);
  } else if (ArrayBuffer.isView(contents)) {
    normalized = new Uint8Array(contents.buffer);
  } else {
    normalized = contents as string;
  }

  _trackFile(filepath);

  if (filepath.startsWith('/documents')) {
    const isDb = filepath.endsWith('.sqlite');

    const { store } = idb.getStore(await idb.getDatabase(), 'files');

    if (isDb) {
      // Record the db's existence in IDB so populateFileHierarchy
      // can rebuild the tree on next startup. The actual db data is
      // managed by the OPFS SAH Pool VFS.
      await idb.set(store, { filepath, contents: '' });

      const poolUtil = _getSAHPoolUtil();
      if (poolUtil && normalized) {
        // Import the database content into OPFS so it's available
        // when opened via the SAH Pool VFS (e.g. demo budget import)
        const bytes =
          typeof normalized === 'string'
            ? new TextEncoder().encode(normalized)
            : normalized;
        await poolUtil.importDb(filepath, bytes);
      } else if (!poolUtil && normalized) {
        // Fallback for environments without OPFS (e.g. tests)
        memFiles.set(filepath, normalized);
      }
    } else {
      await idb.set(store, { filepath, contents: normalized });
    }
  } else {
    memFiles.set(filepath, normalized);
  }
  return true;
}

async function _copySqlFile(
  frompath: string,
  topath: string,
): Promise<boolean> {
  const poolUtil = _getSAHPoolUtil();
  if (!poolUtil) {
    logger.log('OPFS not available – SQL file copy is a no-op');
    return false;
  }

  try {
    const data = await poolUtil.exportFile(frompath);
    await poolUtil.importDb(topath, data);

    // Record the new file in IDB metadata and the in-memory tree
    _trackFile(topath);
    const { store } = idb.getStore(await idb.getDatabase(), 'files');
    await idb.set(store, { filepath: topath, contents: '' });
    return true;
  } catch (error) {
    logger.log('Failed to copy database file', error);
    return false;
  }
}

async function _removeFile(filepath: string) {
  if (filepath.startsWith('/documents')) {
    const { store } = idb.getStore(await idb.getDatabase(), 'files');
    await idb.del(store, filepath);

    if (filepath.endsWith('.sqlite')) {
      const poolUtil = _getSAHPoolUtil();
      if (poolUtil) {
        try {
          poolUtil.unlink(filepath);
        } catch {
          // Ignore – file may already be gone
        }
      }
    }
  }

  memFiles.delete(filepath);
  trackedFiles.delete(filepath);
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
  const fetchFile = (url: string) => fetch(url).then(res => res.arrayBuffer());

  await mkdir('/migrations');
  await mkdir('/demo-budget');

  await Promise.all(
    files.map(async file => {
      const contents = await fetchFile(process.env.PUBLIC_URL + 'data/' + file);
      await _writeFile('/' + file, contents);
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
    _trackFile(path);
  }
};

export const init = async function () {
  _resetFS();

  // Create base directories
  knownDirs.add('/uploads');
  knownDirs.add('/documents');

  if (process.env.NODE_ENV !== 'test') {
    await populateDefaultFilesystem();
  }

  await populateFileHierarchy();
};

export const basename = function (filepath: string) {
  const parts = filepath.split('/');
  return parts.slice(0, -1).join('/');
};

export const listDir = async function (filepath: string) {
  const prefix = filepath.endsWith('/') ? filepath : filepath + '/';
  const children = new Set<string>();

  // Collect immediate children from directories
  for (const dir of knownDirs) {
    if (dir.startsWith(prefix)) {
      const rest = dir.slice(prefix.length);
      const firstSegment = rest.split('/')[0];
      if (firstSegment) {
        children.add(firstSegment);
      }
    }
  }

  // Collect immediate children from tracked files
  for (const file of trackedFiles) {
    if (file.startsWith(prefix)) {
      const rest = file.slice(prefix.length);
      const firstSegment = rest.split('/')[0];
      if (firstSegment) {
        children.add(firstSegment);
      }
    }
  }

  // Also check in-memory files
  for (const file of memFiles.keys()) {
    if (file.startsWith(prefix)) {
      const rest = file.slice(prefix.length);
      const firstSegment = rest.split('/')[0];
      if (firstSegment) {
        children.add(firstSegment);
      }
    }
  }

  return [...children];
};

export const exists = async function (filepath: string) {
  return _exists(filepath);
};

export const mkdir = async function (filepath: string) {
  knownDirs.add(filepath);
};

export const size = async function (filepath: string) {
  const contents = memFiles.get(filepath);
  if (contents !== undefined) {
    return typeof contents === 'string'
      ? new TextEncoder().encode(contents).byteLength
      : contents.byteLength;
  }

  // For IDB-backed files, fetch and check
  if (filepath.startsWith('/documents') && !filepath.endsWith('.sqlite')) {
    const { store } = idb.getStore(await idb.getDatabase(), 'files');
    const item = await idb.get(store, filepath);
    if (item) {
      if (typeof item.contents === 'string') {
        return new TextEncoder().encode(item.contents).byteLength;
      }
      if (ArrayBuffer.isView(item.contents)) {
        return item.contents.byteLength;
      }
    }
  }

  return 0;
};

export const copyFile = async function (
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

export const writeFile = async function (filepath: string, contents) {
  return _writeFile(filepath, contents);
};

export const removeFile = async function (filepath: string) {
  return _removeFile(filepath);
};

export const removeDir = async function (filepath: string) {
  knownDirs.delete(filepath);
};

export const removeDirRecursively = async function (dirpath: string) {
  if (await exists(dirpath)) {
    for (const file of await listDir(dirpath)) {
      const fullpath = join(dirpath, file);

      if (knownDirs.has(fullpath)) {
        await removeDirRecursively(fullpath);
      } else {
        await removeFile(fullpath);
      }
    }

    await removeDir(dirpath);
  }
};

export const getModifiedTime = async (_filepath: string): Promise<Date> => {
  throw new Error(
    'getModifiedTime not supported on the web (only used for backups)',
  );
};
