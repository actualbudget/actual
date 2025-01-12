import Database from 'better-sqlite3';

class WrappedDatabase {
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string} sql
   * @param {string[]} params
   */
  all(sql, params = []) {
    let stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * @param {string} sql
   * @param {string[]} params
   */
  first(sql, params = []) {
    let rows = this.all(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  /**
   * @param {string} sql
   */
  exec(sql) {
    return this.db.exec(sql);
  }

  /**
   * @param {string} sql
   * @param {string[]} params
   */
  mutate(sql, params = []) {
    let stmt = this.db.prepare(sql);
    let info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }

  /**
   * @param {() => void} fn
   */
  transaction(fn) {
    return this.db.transaction(fn)();
  }

  close() {
    this.db.close();
  }
}

/** @param {string} filename */
export default function openDatabase(filename) {
  return new WrappedDatabase(new Database(filename));
}
