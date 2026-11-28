import { dirname, filename, normalizePath } from './web-paths';

export type MemFsContents = Uint8Array | string;

// A tiny in-memory file tree. The web filesystem keeps the directory
// hierarchy of persisted files here (their contents live in IndexedDB or
// OPFS) and stores transient files such as uploads directly.
export function createMemFs() {
  const directories = new Set<string>(['/']);
  // `null` marks a file whose contents are kept elsewhere
  const files = new Map<string, MemFsContents | null>();

  function exists(path: string): boolean {
    const normalized = normalizePath(path);
    return directories.has(normalized) || files.has(normalized);
  }

  function isDirectory(path: string): boolean {
    return directories.has(normalizePath(path));
  }

  function mkdir(path: string) {
    const normalized = normalizePath(path);
    if (files.has(normalized)) {
      throw new Error(`mkdir: a file exists at ${normalized}`);
    }
    if (normalized !== '/' && !directories.has(dirname(normalized))) {
      throw new Error(`mkdir: parent directory does not exist: ${normalized}`);
    }
    directories.add(normalized);
  }

  function mkdirp(path: string) {
    const parts = normalizePath(path)
      .split('/')
      .filter(part => part !== '');
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      if (!directories.has(current)) {
        mkdir(current);
      }
    }
  }

  function readdir(path: string): string[] {
    const normalized = normalizePath(path);
    if (!directories.has(normalized)) {
      throw new Error(`readdir: no such directory: ${normalized}`);
    }
    const names = new Set<string>();
    for (const directory of directories) {
      if (directory !== normalized && dirname(directory) === normalized) {
        names.add(filename(directory));
      }
    }
    for (const file of files.keys()) {
      if (dirname(file) === normalized) {
        names.add(filename(file));
      }
    }
    return [...names];
  }

  function writeFile(path: string, contents: MemFsContents | null) {
    const normalized = normalizePath(path);
    if (directories.has(normalized)) {
      throw new Error(`writeFile: a directory exists at ${normalized}`);
    }
    mkdirp(dirname(normalized));
    files.set(normalized, contents);
  }

  function readFile(path: string): MemFsContents | null | undefined {
    return files.get(normalizePath(path));
  }

  function unlink(path: string) {
    files.delete(normalizePath(path));
  }

  function rmdir(path: string) {
    const normalized = normalizePath(path);
    if (!directories.has(normalized)) {
      throw new Error(`rmdir: no such directory: ${normalized}`);
    }
    if (readdir(normalized).length > 0) {
      throw new Error(`rmdir: directory not empty: ${normalized}`);
    }
    directories.delete(normalized);
  }

  return {
    exists,
    isDirectory,
    mkdir,
    mkdirp,
    readdir,
    writeFile,
    readFile,
    unlink,
    rmdir,
  };
}

export type MemFs = ReturnType<typeof createMemFs>;
