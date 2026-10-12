import Database from 'better-sqlite3';

type SqlParam = string | number | bigint | Buffer | Uint8Array | null;

type MutationResult = {
  changes: number;
  insertId: number | bigint;
};

type SqlRow = Record<string, unknown>;

export class WrappedDatabase {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  all<T = SqlRow>(sql: string, params: SqlParam[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  first<T = SqlRow>(sql: string, params: SqlParam[] = []): T | null {
    const rows = this.all<T>(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  exec(sql: string): Database.Database {
    return this.db.exec(sql);
  }

  mutate(sql: string, params: SqlParam[] = []): MutationResult {
    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}

export function openDatabase(filename: string): WrappedDatabase {
  return new WrappedDatabase(new Database(filename));
}
