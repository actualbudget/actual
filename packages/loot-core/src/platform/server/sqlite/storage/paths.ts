import { dirname, filename, pathToId } from '#platform/server/fs/web-paths';

// A sqlite file path like '/documents/Actual/<id>/db.sqlite' maps to a
// pool per directory (so budgets can be open in different tabs) and a
// logical file name inside it. absurd-sql's IndexedDB database for the
// same file was named by the full path.
export function splitSqlitePath(path: string): {
  dirId: string;
  fileName: string;
} {
  return { dirId: pathToId(dirname(path)), fileName: '/' + filename(path) };
}

export function legacyDatabaseName(path: string): string {
  return pathToId(path);
}
