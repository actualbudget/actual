// @ts-strict-ignore
import { join } from '#platform/server/fs/path-join';
import type { StorageBackend } from '#platform/server/sqlite';

import * as legacy from './fs.legacy';
import * as web from './fs.web';

// The web filesystem is a facade over two implementations: the legacy one
// (Emscripten MEMFS plus absurd-sql) and the one backing the sqlite-wasm
// storage. `init` picks one from the storage backend; everything else
// forwards to it.
type Implementation = typeof web;
let impl: Implementation = legacy as unknown as Implementation;

export const bundledDatabasePath: string = web.bundledDatabasePath;
export const migrationsPath: string = web.migrationsPath;
export const demoBudgetPath: string = web.demoBudgetPath;
export { join };
export { getDocumentDir, getBudgetDir } from './shared';
export { pathToId } from './web-paths';
export const getDataDir = () => process.env.ACTUAL_DATA_DIR;

export async function init({
  storage = 'legacy',
}: { storage?: StorageBackend } = {}) {
  impl = storage === 'legacy' ? (legacy as unknown as Implementation) : web;
  await impl.init();
}

export const _setDocumentDir = (dir: string) => impl._setDocumentDir(dir);
export const basename = (filepath: string) => impl.basename(filepath);
export const listDir = (filepath: string) => impl.listDir(filepath);
export const exists = (filepath: string) => impl.exists(filepath);
export const mkdir = (filepath: string) => impl.mkdir(filepath);
export const size = (filepath: string) => impl.size(filepath);
export const copyFile = (frompath: string, topath: string) =>
  impl.copyFile(frompath, topath);

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
    return impl.readFile(filepath, encoding);
  }
  return impl.readFile(filepath, encoding);
}

export const writeFile = (
  filepath: string,
  contents: string | ArrayBuffer | ArrayBufferView,
) => impl.writeFile(filepath, contents);
export const removeFile = (filepath: string) => impl.removeFile(filepath);
export const removeDir = (filepath: string) => impl.removeDir(filepath);
export const removeDirRecursively = (dirpath: string) =>
  impl.removeDirRecursively(dirpath);
export const getModifiedTime = (filepath: string) =>
  impl.getModifiedTime(filepath);
