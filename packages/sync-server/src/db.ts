import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

export class WrappedDatabase {
  private db: SqliteDatabase;

  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  all<Row = any>(sql: string, params: (string | number)[] = []): Row[] {
    const stmt = this.db.prepare<unknown[], Row>(sql);
    return stmt.all(...params);
  }

  // oxlint-disable-next-line typescript/no-explicit-any
  first<Row = any>(sql: string, params: string[] = []): Row | null {
    const rows = this.all<Row>(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  exec(sql: string): SqliteDatabase {
    return this.db.exec(sql);
  }

  mutate(sql: string, params: (string | number | null | undefined)[] = []) {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }

  transaction<Result>(fn: () => Result): Result {
    return this.db.transaction(fn)();
  }

  close() {
    this.db.close();
  }
}

export function openDatabase(filename: string) {
  return new WrappedDatabase(new Database(filename));
}
