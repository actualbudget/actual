import * as idb from '#platform/server/indexeddb';
import {
  exportDatabasePath,
  importDatabasePath,
  removeDatabasePath,
} from '#platform/server/sqlite';

import { join } from './path-join';
import {
  getBudgetDir,
  getDocumentDir,
  _setDocumentDir as setSharedDocumentDir,
} from './shared';

type FileContents = string | Uint8Array;
type FileInput = string | ArrayBuffer | ArrayBufferView;

const DATABASE_PATH = /\.sqlite(?:\.tmp)?$/;

const directories = new Set<string>();
const files = new Set<string>();
const transientFiles = new Map<string, FileContents>();
const requiredDirectories = new Set<string>();
const explicitDirectories = new Set<string>();
const persistedFiles = new Set<string>();

let customPersistedRoot: string | null = null;

export const bundledDatabasePath: string = '/default-db.sqlite';
export const migrationsPath: string = '/migrations';
export const demoBudgetPath: string = '/demo-budget';
export { getBudgetDir, getDocumentDir, join };
export const getDataDir = () => process.env.ACTUAL_DATA_DIR;

function normalizePath(filepath: string) {
  const absolutePath = filepath.startsWith('/') ? filepath : `/${filepath}`;
  const normalizedPath = join('/', absolutePath);
  return normalizedPath.replace(/\/+$/, '') || '/';
}

function parentPath(filepath: string) {
  const normalizedPath = normalizePath(filepath);
  if (normalizedPath === '/') {
    return '/';
  }
  return normalizedPath.slice(0, normalizedPath.lastIndexOf('/')) || '/';
}

function isUnderRoot(path: string, root: string) {
  return path === root || path.startsWith(`${root}/`);
}

function isPersistedPath(filepath: string) {
  const path = normalizePath(filepath);
  return (
    isUnderRoot(path, '/documents') ||
    (customPersistedRoot !== null && isUnderRoot(path, customPersistedRoot))
  );
}

function isDatabasePath(filepath: string) {
  const path = normalizePath(filepath);
  return isPersistedPath(path) && DATABASE_PATH.test(path);
}

function ensureDirectory(filepath: string) {
  const path = normalizePath(filepath);
  if (files.has(path)) {
    throw new Error(`Path is already a file: ${path}`);
  }
  if (path !== '/') {
    ensureDirectory(parentPath(path));
  }
  directories.add(path);
}

function addRequiredDirectory(filepath: string) {
  const path = normalizePath(filepath);
  requiredDirectories.add(path);
  ensureDirectory(path);
}

function rebuildDirectoryHierarchy() {
  directories.clear();
  directories.add('/');

  const addAncestors = (filepath: string) => {
    let path = normalizePath(filepath);
    while (path !== '/') {
      directories.add(path);
      path = parentPath(path);
    }
  };

  for (const directory of [...requiredDirectories, ...explicitDirectories]) {
    addAncestors(directory);
  }
  for (const filepath of files) {
    addAncestors(parentPath(filepath));
  }
}

function retirePersistedDirectoryPlaceholders(filepath: string) {
  let directory = parentPath(filepath);
  while (isPersistedPath(directory)) {
    if (!requiredDirectories.has(directory)) {
      explicitDirectories.delete(directory);
    }
    if (directory === '/') {
      break;
    }
    directory = parentPath(directory);
  }
}

function addFile(filepath: string) {
  const path = normalizePath(filepath);
  if (directories.has(path)) {
    throw new Error(`Path is already a directory: ${path}`);
  }
  ensureDirectory(parentPath(path));
  files.add(path);
}

function cloneBytes(value: ArrayBuffer | ArrayBufferView) {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value.slice(0));
  }
  return new Uint8Array(
    value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength),
  );
}

function normalizeContents(value: FileInput): FileContents {
  return typeof value === 'string' ? value : cloneBytes(value);
}

function contentsToBytes(value: FileContents) {
  return typeof value === 'string'
    ? new TextEncoder().encode(value)
    : value.slice();
}

function inferBackupModifiedTime(filepath: string) {
  const filename = normalizePath(filepath).split('/').at(-1);
  const match = filename?.match(
    /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})\.zip$/,
  );
  if (match === undefined || match === null) {
    return undefined;
  }

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}

async function getStoredFile(filepath: string) {
  const database = await idb.openDatabase();
  const { store } = idb.getStore(database, 'files');
  return await idb.get(store, normalizePath(filepath));
}

async function storeFile(file: idb.StoredFile) {
  const database = await idb.openDatabase();
  const { store } = idb.getStore(database, 'files');
  await idb.set(store, file);
}

async function deleteStoredFile(filepath: string) {
  const database = await idb.openDatabase();
  const { store } = idb.getStore(database, 'files');
  await idb.del(store, normalizePath(filepath));
}

export const _setDocumentDir = (dir: string) => {
  const root = normalizePath(dir);
  customPersistedRoot = root;
  addRequiredDirectory(root);
  return setSharedDocumentDir(root);
};

export const pathToId = (filepath: string) =>
  filepath.replace(/^\//, '').replaceAll('/', '-');

async function populateDefaultFilesystem() {
  const response = await fetch(`${process.env.PUBLIC_URL}data-file-index.txt`);
  const filenames = (await response.text())
    .split('\n')
    .map(filename => filename.trim())
    .filter(Boolean);

  addRequiredDirectory(migrationsPath);
  addRequiredDirectory(demoBudgetPath);

  await Promise.all(
    filenames.map(async filename => {
      const fileResponse = await fetch(
        `${process.env.PUBLIC_URL}data/${filename}`,
      );
      const contents = await fileResponse.arrayBuffer();
      const path = `/${filename.replace(/\.data$/, '')}`;
      transientFiles.set(normalizePath(path), cloneBytes(contents));
      addFile(path);
    }),
  );
}

export async function refreshPersistedHierarchy() {
  const filepaths = await idb.getPersistedFilepaths();
  const nextPersistedFiles = new Set(filepaths.map(normalizePath));

  for (const path of persistedFiles) {
    files.delete(path);
  }
  persistedFiles.clear();
  for (const path of nextPersistedFiles) {
    files.add(path);
    persistedFiles.add(path);
    retirePersistedDirectoryPlaceholders(path);
  }
  rebuildDirectoryHierarchy();
}

export async function init() {
  directories.clear();
  files.clear();
  transientFiles.clear();
  requiredDirectories.clear();
  explicitDirectories.clear();
  persistedFiles.clear();
  customPersistedRoot = null;

  addRequiredDirectory('/');
  addRequiredDirectory('/uploads');
  addRequiredDirectory('/documents');
  await populateDefaultFilesystem();
  await refreshPersistedHierarchy();
}

export const basename = parentPath;

export async function listDir(filepath: string) {
  const directory = normalizePath(filepath);
  if (isPersistedPath(directory)) {
    await refreshPersistedHierarchy();
  }
  if (!directories.has(directory)) {
    throw new Error(`Directory does not exist: ${directory}`);
  }

  const prefix = directory === '/' ? '/' : `${directory}/`;
  const children = new Set<string>();
  for (const path of [...directories, ...files]) {
    if (path === directory || !path.startsWith(prefix)) {
      continue;
    }
    children.add(path.slice(prefix.length).split('/')[0]);
  }
  return [...children];
}

export async function exists(filepath: string) {
  const path = normalizePath(filepath);
  return directories.has(path) || files.has(path);
}

export async function mkdir(filepath: string) {
  const path = normalizePath(filepath);
  if (files.has(path) || directories.has(path)) {
    throw new Error(`Path already exists: ${path}`);
  }
  const parent = parentPath(path);
  if (!directories.has(parent)) {
    throw new Error(`Parent directory does not exist: ${parent}`);
  }
  directories.add(path);
  explicitDirectories.add(path);
}

async function readBytes(filepath: string) {
  const path = normalizePath(filepath);
  if (isPersistedPath(path)) {
    await refreshPersistedHierarchy();
  }
  if (!files.has(path)) {
    throw new Error(`File does not exist: ${path}`);
  }

  if (isDatabasePath(path)) {
    return await exportDatabasePath(path);
  }

  const contents = isPersistedPath(path)
    ? (await getStoredFile(path))?.contents
    : transientFiles.get(path);
  if (contents === undefined) {
    throw new Error(`File does not exist: ${path}`);
  }
  return contentsToBytes(contents);
}

export async function size(filepath: string) {
  return (await readBytes(filepath)).byteLength;
}

export async function copyFile(frompath: string, topath: string) {
  await writeFile(topath, await readBytes(frompath));
  return true;
}

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
): Promise<string | Uint8Array> {
  const contents = await readBytes(filepath);
  return encoding === 'binary' ? contents : new TextDecoder().decode(contents);
}

export async function writeFile(filepath: string, value: FileInput) {
  const path = normalizePath(filepath);
  const contents = normalizeContents(value);
  if (directories.has(path)) {
    throw new Error(`Path is already a directory: ${path}`);
  }
  const parent = parentPath(path);
  if (!directories.has(parent)) {
    throw new Error(`Parent directory does not exist: ${parent}`);
  }

  if (isDatabasePath(path)) {
    await importDatabasePath(path, contentsToBytes(contents));
    await storeFile({
      filepath: path,
      contents: '',
      modifiedTime: Date.now(),
    });
  } else if (isPersistedPath(path)) {
    await storeFile({
      filepath: path,
      contents,
      modifiedTime: Date.now(),
    });
  } else {
    transientFiles.set(path, contents);
  }

  addFile(path);
  if (isPersistedPath(path)) {
    persistedFiles.add(path);
    retirePersistedDirectoryPlaceholders(path);
  }
  return true;
}

export async function removeFile(filepath: string) {
  const path = normalizePath(filepath);
  if (isPersistedPath(path)) {
    await refreshPersistedHierarchy();
  }
  if (!files.has(path)) {
    throw new Error(`File does not exist: ${path}`);
  }

  if (isDatabasePath(path)) {
    await removeDatabasePath(path);
    await deleteStoredFile(path);
  } else if (isPersistedPath(path)) {
    await deleteStoredFile(path);
  } else {
    transientFiles.delete(path);
  }
  files.delete(path);
  persistedFiles.delete(path);
}

export async function removeDir(filepath: string) {
  const path = normalizePath(filepath);
  if (isPersistedPath(path)) {
    await refreshPersistedHierarchy();
  }
  if (!directories.has(path)) {
    throw new Error(`Directory does not exist: ${path}`);
  }
  if ((await listDir(path)).length > 0) {
    throw new Error(`Directory is not empty: ${path}`);
  }
  if (path === '/') {
    throw new Error('Cannot remove the filesystem root');
  }
  directories.delete(path);
  explicitDirectories.delete(path);
}

export async function removeDirRecursively(filepath: string) {
  const path = normalizePath(filepath);
  if (!(await exists(path))) {
    return;
  }

  for (const child of await listDir(path)) {
    const childPath = join(path, child);
    if (directories.has(childPath)) {
      await removeDirRecursively(childPath);
    } else {
      await removeFile(childPath);
    }
  }
  if (isPersistedPath(path)) {
    await refreshPersistedHierarchy();
  }
  if (directories.has(path)) {
    await removeDir(path);
  }
}

export async function getModifiedTime(filepath: string): Promise<Date> {
  const path = normalizePath(filepath);
  if (!files.has(path)) {
    throw new Error(`File does not exist: ${path}`);
  }

  if (isPersistedPath(path)) {
    const modifiedTime = (await getStoredFile(path))?.modifiedTime;
    if (modifiedTime !== undefined) {
      return new Date(modifiedTime);
    }

    // Browser backups written before modified times were persisted have no
    // stored timestamp. Their filenames include the creation timestamp, so
    // preserve backup rotation order instead of collapsing them into the epoch.
    const inferredModifiedTime = inferBackupModifiedTime(path);
    if (inferredModifiedTime !== undefined) {
      return new Date(inferredModifiedTime);
    }
  }

  return new Date(0);
}
