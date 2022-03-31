let Database = require('better-sqlite3');

class WrappedDatabase {
  constructor(db) {
    this.db = db;
  }

  all(sql, params = []) {
    let stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  first(sql, params = []) {
    let rows = this.all(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  exec(sql) {
    this.db.exec(sql);
  }

  mutate(sql, params = []) {
    let stmt = this.db.prepare(sql);
    let info = stmt.run(...params);
    return { changes: info.changes, insertId: info.lastInsertRowid };
  }

  transaction(fn) {
    return this.db.transaction(fn)();
  }

  close() {
    this.db.close();
  }
}

function openDatabase(filename) {
  return new WrappedDatabase(new Database(filename));
}

module.exports = { openDatabase };
