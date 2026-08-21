import type sqlite3InitModule from '@sqlite.org/sqlite-wasm';

type SqliteModule = {
  default: typeof sqlite3InitModule;
};

export async function loadSqliteInitModule(publicUrl: string) {
  const moduleUrl = `${publicUrl}kcab/sqlite3.js`;
  const sqliteModule = (await import(
    /* @vite-ignore */ moduleUrl
  )) as SqliteModule;
  return sqliteModule.default;
}
