import { dirname, filename, normalizePath } from './web-paths';

export type MemFsContents = Uint8Array | string;

// A tiny in-memory file tree. The web filesystem keeps the directory
// hierarchy of persisted files here (their contents live in IndexedDB or
// OPFS) and stores transient files such as uploads directly.
export class MemFs {
  private directories = new Set<string>(['/']);
  // `null` marks a file whose contents are kept elsewhere
  private files = new Map<string, MemFsContents | null>();

  exists(path: string): boolean {
    const normalized = normalizePath(path);
    return this.directories.has(normalized) || this.files.has(normalized);
  }

  isDirectory(path: string): boolean {
    return this.directories.has(normalizePath(path));
  }

  isFile(path: string): boolean {
    return this.files.has(normalizePath(path));
  }

  mkdir(path: string) {
    const normalized = normalizePath(path);
    if (this.files.has(normalized)) {
      throw new Error(`mkdir: a file exists at ${normalized}`);
    }
    if (normalized !== '/' && !this.directories.has(dirname(normalized))) {
      throw new Error(`mkdir: parent directory does not exist: ${normalized}`);
    }
    this.directories.add(normalized);
  }

  mkdirp(path: string) {
    const parts = normalizePath(path)
      .split('/')
      .filter(part => part !== '');
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      if (!this.directories.has(current)) {
        this.mkdir(current);
      }
    }
  }

  readdir(path: string): string[] {
    const normalized = normalizePath(path);
    if (!this.directories.has(normalized)) {
      throw new Error(`readdir: no such directory: ${normalized}`);
    }
    const prefix = normalized === '/' ? '/' : normalized + '/';
    const names = new Set<string>();
    for (const directory of this.directories) {
      if (directory !== normalized && dirname(directory) === normalized) {
        names.add(filename(directory));
      }
    }
    for (const file of this.files.keys()) {
      if (file.startsWith(prefix) && dirname(file) === normalized) {
        names.add(filename(file));
      }
    }
    return [...names];
  }

  writeFile(path: string, contents: MemFsContents | null) {
    const normalized = normalizePath(path);
    if (this.directories.has(normalized)) {
      throw new Error(`writeFile: a directory exists at ${normalized}`);
    }
    this.mkdirp(dirname(normalized));
    this.files.set(normalized, contents);
  }

  readFile(path: string): MemFsContents | null | undefined {
    return this.files.get(normalizePath(path));
  }

  unlink(path: string) {
    this.files.delete(normalizePath(path));
  }

  rmdir(path: string) {
    const normalized = normalizePath(path);
    if (!this.directories.has(normalized)) {
      throw new Error(`rmdir: no such directory: ${normalized}`);
    }
    if (this.readdir(normalized).length > 0) {
      throw new Error(`rmdir: directory not empty: ${normalized}`);
    }
    this.directories.delete(normalized);
  }
}
