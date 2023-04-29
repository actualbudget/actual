export { default as join } from './path-join';

export function init(): void;
export type Init = typeof init;

export function getDataDir(): string;
export type GetDataDir = typeof getDataDir;

export function _setDocumentDir(dir: string): string;
export type _setDocumentDir = typeof _setDocumentDir;

export function getDocumentDir(): string;
export type GetDocumentDir = typeof getDocumentDir;

export function getBudgetDir(id: string): string;
export type GetBudgetDir = typeof getBudgetDir;

export const bundledDatabasePath: string;
export type BundledDatabasePath = typeof bundledDatabasePath;

export const migrationsPath: string;
export type MigrationsPath = typeof migrationsPath;

export const demoBudgetPath: string;
export type DemoBudgetPath = typeof demoBudgetPath;

export function pathToId(filepath: string): string;
export type PathToId = typeof pathToId;

export function basename(filepath: string): string;
export type Basename = typeof basename;

export function listDir(filepath: string): Promise<string[]>;
export type ListDir = typeof listDir;

export function exists(filepath: string): Promise<boolean>;
export type Exists = typeof exists;

export function mkdir(filepath: string): Promise<undefined>;
export type Mkdir = typeof mkdir;

export function size(filepath: string): Promise<undefined>;
export type Size = typeof size;

export function copyFile(frompath: string, topath: string): Promise<undefined>;
export type CopyFile = typeof copyFile;

export function readFile(
  filepath: string,
  encoding: 'binary' | null,
): Promise<Buffer>;
export function readFile(filepath: string, encoding?: 'utf8'): Promise<string>;
export type ReadFile = typeof readFile;

export function writeFile(
  filepath: string,
  contents: string | ArrayBuffer | NodeJS.ArrayBufferView,
): Promise<undefined>;
export type WriteFile = typeof writeFile;

export function removeFile(filepath: string): Promise<undefined>;
export type RemoveFile = typeof removeFile;

export function removeDir(dirpath: string): Promise<undefined>;
export type RemoveDir = typeof removeDir;

export function removeDirRecursively(dirpath: string): Promise<undefined>;
export type RemoveDirRecursively = typeof removeDirRecursively;

export function getModifiedTime(filepath: string): Promise<string>;
export type GetModifiedTime = typeof getModifiedTime;
