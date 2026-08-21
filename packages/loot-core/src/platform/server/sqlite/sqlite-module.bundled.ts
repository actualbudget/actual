import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

export function loadSqliteInitModule(_publicUrl: string) {
  return Promise.resolve(sqlite3InitModule);
}
