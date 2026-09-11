import { readFile } from 'node:fs/promises';

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Database, Sqlite3Static } from '@sqlite.org/sqlite-wasm';

import {
  closeDatabase,
  execQuery,
  init,
  openDatabase,
  prepare,
  runQuery,
  setWasmBinary,
  transaction,
} from './index';

let sqlite3: Sqlite3Static;
let db: Database;

beforeAll(async () => {
  setWasmBinary(
    await readFile(
      `${__dirname}/../../../../../../node_modules/@sqlite.org/sqlite-wasm/dist/sqlite3.wasm`,
    ),
  );
  await init();
  sqlite3 = await sqlite3InitModule();
});

beforeEach(() => {
  db = new sqlite3.oo1.DB();
  execQuery(db, 'CREATE TABLE data (id TEXT PRIMARY KEY, value INTEGER)');
});

afterEach(() => {
  db.close();
});

describe('browser SQLite adapter', () => {
  it('reuses prepared statements synchronously', () => {
    const statement = prepare(db, 'INSERT INTO data (id, value) VALUES (?, ?)');

    runQuery(db, statement, ['one', 1]);
    runQuery(db, statement, ['two', 2]);

    const rows = runQuery<{ id: string; value: number }>(
      db,
      'SELECT * FROM data ORDER BY id',
      [],
      true,
    );
    expect(rows).toEqual([
      { id: 'one', value: 1 },
      { id: 'two', value: 2 },
    ]);
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);

    statement.finalize();
  });

  it('rolls back a nested savepoint without losing the outer transaction', () => {
    transaction(db, () => {
      runQuery(db, "INSERT INTO data VALUES ('outer', 1)");

      expect(() => {
        transaction(db, () => {
          runQuery(db, "INSERT INTO data VALUES ('nested', 2)");
          runQuery(db, "INSERT INTO data VALUES ('outer', 3)");
        });
      }).toThrow();

      runQuery(db, "INSERT INTO data VALUES ('after', 4)");
    });

    expect(
      runQuery<{ id: string }>(db, 'SELECT id FROM data ORDER BY id', [], true),
    ).toEqual([{ id: 'after' }, { id: 'outer' }]);
  });

  it('reopens a serialized database whose header says it uses WAL', async () => {
    const source = new sqlite3.oo1.DB();
    source.exec(
      "CREATE TABLE example (value TEXT); INSERT INTO example VALUES ('saved')",
    );
    const bytes = sqlite3.capi.sqlite3_js_db_export(source);
    source.close();

    bytes[18] = 2;
    bytes[19] = 2;

    const imported = await openDatabase(bytes);
    try {
      expect(
        runQuery<{ value: string }>(
          imported,
          'SELECT value FROM example',
          [],
          true,
        ),
      ).toEqual([{ value: 'saved' }]);
    } finally {
      closeDatabase(imported);
    }
  });
});
