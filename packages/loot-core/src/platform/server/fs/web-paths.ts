// Path helpers for the web filesystem. Kept free of dependencies so the
// sqlite storage layer can use them without importing the filesystem.

export function normalizePath(filepath: string): string {
  const absolute = filepath.startsWith('/') ? filepath : '/' + filepath;
  let end = absolute.length;
  while (end > 1 && absolute[end - 1] === '/') {
    end--;
  }
  return absolute.slice(0, end);
}

export function isUnderRoot(path: string, root: string): boolean {
  return path === root || path.startsWith(root + '/');
}

// The directory part of a path: '/documents/Actual/x/db.sqlite' →
// '/documents/Actual/x'. The legacy filesystem calls this `basename`.
export function dirname(filepath: string): string {
  const parts = normalizePath(filepath).split('/');
  const dir = parts.slice(0, -1).join('/');
  return dir === '' ? '/' : dir;
}

export function filename(filepath: string): string {
  const parts = normalizePath(filepath).split('/');
  return parts[parts.length - 1];
}

export function isSqlitePath(filepath: string): boolean {
  return filepath.endsWith('.sqlite');
}

// The storage identifier of a path, also the name absurd-sql used for
// the IndexedDB database holding a sqlite file:
// '/documents/Actual/x/db.sqlite' → 'documents-Actual-x-db.sqlite'
export function pathToId(filepath: string): string {
  return filepath.replace(/^\//, '').replace(/\//g, '-');
}
