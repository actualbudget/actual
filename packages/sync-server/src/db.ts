import Database from 'better-sqlite3';
import type { Database as SqliteDatabase } from 'better-sqlite3';

export class WrappedDatabase {
  db: SqliteDatabase;
  constructor(db: SqliteDatabase) {
    this.db = db;
  }

  all<T = any>(sql: string, params: (string | number)[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  first<T = any>(sql: string, params: (string | number)[] = []): T | null {
    const rows = this.all(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  exec(sql: string): this {
    this.db.exec(sql);
    return this;
  }

  mutate(
    sql: string,
    params: (string | number | null | undefined)[] = [],
  ): { changes: number; insertId: number | bigint } {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close() {
    this.db.close();
  }
}

export function openDatabase(filename: string) {
  return new WrappedDatabase(new Database(filename));
}
