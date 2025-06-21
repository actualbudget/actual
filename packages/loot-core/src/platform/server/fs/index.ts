export { join } from './path-join';

export declare function init(): void;
export type Init = typeof init;

export declare function getDataDir(): string;
export type GetDataDir = typeof getDataDir;

export declare function _setDocumentDir(dir: string): string;
export type _SetDocumentDir = typeof _setDocumentDir;

export declare function getDocumentDir(): string;
export type GetDocumentDir = typeof getDocumentDir;

export declare function getBudgetDir(id: string): string;
export type GetBudgetDir = typeof getBudgetDir;

export declare const bundledDatabasePath: string;
export type BundledDatabasePath = typeof bundledDatabasePath;

export declare const migrationsPath: string;
export type MigrationsPath = typeof migrationsPath;

export declare const demoBudgetPath: string;
export type DemoBudgetPath = typeof demoBudgetPath;

export declare function pathToId(filepath: string): string;
export type PathToId = typeof pathToId;

export declare function basename(filepath: string): string;
export type Basename = typeof basename;

export declare function listDir(filepath: string): Promise<string[]>;
export type ListDir = typeof listDir;

export declare function exists(filepath: string): Promise<boolean>;
export type Exists = typeof exists;

export declare function mkdir(filepath: string): Promise<undefined>;
export type Mkdir = typeof mkdir;

export declare function size(filepath: string): Promise<number>;
export type Size = typeof size;

export declare function copyFile(
  frompath: string,
  topath: string,
): Promise<boolean>;
export type CopyFile = typeof copyFile;

export declare function readFile(
  filepath: string,
  encoding: 'binary' | null,
): Promise<Buffer>;
export declare function readFile(
  filepath: string,
  encoding?: 'utf8',
): Promise<string>;
export type ReadFile = typeof readFile;

export declare function writeFile(
  filepath: string,
  contents: string | ArrayBuffer | NodeJS.ArrayBufferView,
): Promise<undefined>;
export type WriteFile = typeof writeFile;

export declare function removeFile(filepath: string): Promise<undefined>;
export type RemoveFile = typeof removeFile;

export declare function removeDir(dirpath: string): Promise<undefined>;
export type RemoveDir = typeof removeDir;

export declare function removeDirRecursively(
  dirpath: string,
): Promise<undefined>;
export type RemoveDirRecursively = typeof removeDirRecursively;

export declare function getModifiedTime(filepath: string): Promise<string>;
export type GetModifiedTime = typeof getModifiedTime;
