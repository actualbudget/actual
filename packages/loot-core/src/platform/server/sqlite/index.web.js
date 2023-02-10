import initSqlJS from '@jlongster/sql.js';
import * as perf from 'perf-deets';

let SQL = null;

export async function init() {
  // `initSqlJS` doesn't actually return a real promise, so make sure
  // we're returning a real one for correct semantics
  return new Promise((resolve, reject) => {
    initSqlJS({
      locateFile: file => process.env.PUBLIC_URL + file,
    }).then(
      sql => {
        SQL = sql;
        resolve();
      },
      err => {
        reject(err);
      },
    );
  });
}

export function _getModule() {
  if (SQL == null) {
    throw new Error('_getModule: sql.js must be initialized first');
  }
  return SQL;
}

function verifyParamTypes(sql, arr) {
  arr.forEach(val => {
    if (typeof val !== 'string' && typeof val !== 'number' && val !== null) {
      throw new Error('Invalid field type ' + val + ' for sql ' + sql);
    }
  });
}

export function prepare(db, sql) {
  return db.prepare(sql);
}

export function runQuery(db, sql, params = [], fetchAll) {
  perf.count('runQuery');
  if (params) {
    verifyParamTypes(sql, params);
  }

  let stmt = typeof sql === 'string' ? db.prepare(sql) : sql;

  if (fetchAll) {
    try {
      stmt.bind(params);
      let rows = [];

      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }

      if (typeof sql === 'string') {
        stmt.free();
      } else {
        stmt.reset();
      }
      return rows;
    } catch (e) {
      console.log(sql);
      throw e;
    }
  } else {
    try {
      stmt.run(params);
      return { changes: db.getRowsModified() };
    } catch (e) {
      // console.log(sql);
      throw e;
    }
  }
}

export function execQuery(db, sql) {
  db.exec(sql);
}

let transactionDepth = 0;

export function transaction(db, fn) {
  let before, after, undo;
  if (transactionDepth > 0) {
    before = 'SAVEPOINT __actual_sp';
    after = 'RELEASE __actual_sp';
    undo = 'ROLLBACK TO __actual_sp';
  } else {
    before = 'BEGIN';
    after = 'COMMIT';
    undo = 'ROLLBACK';
  }

  execQuery(db, before);
  transactionDepth++;

  try {
    const result = fn();
    execQuery(db, after);
    return result;
  } catch (ex) {
    execQuery(db, undo);

    if (undo !== 'ROLLBACK') {
      execQuery(db, after);
    }

    throw ex;
  } finally {
    transactionDepth--;
  }
}

// See the comment about this function in index.electron.js. You
// shouldn't normally use this. I'd like to get rid of it.
export async function asyncTransaction(db, fn) {
  // Support nested transactions by "coalescing" them into the parent
  // one if one is already started
  if (transactionDepth === 0) {
    db.exec('BEGIN TRANSACTION');
  }
  transactionDepth++;

  try {
    await fn();
  } finally {
    transactionDepth--;
    // We always commit because rollback is more dangerous - any
    // queries that ran *in-between* this async function would be
    // lost. Right now we are only using transactions for speed
    // purposes unfortunately
    if (transactionDepth === 0) {
      db.exec('COMMIT');
    }
  }
}

export async function openDatabase(pathOrBuffer) {
  if (pathOrBuffer) {
    if (typeof pathOrBuffer !== 'string') {
      return new SQL.Database(pathOrBuffer);
    }

    let path = pathOrBuffer;
    if (path !== ':memory:') {
      if (typeof SharedArrayBuffer === 'undefined') {
        let stream = SQL.FS.open(SQL.FS.readlink(path), 'a+');
        await stream.node.contents.readIfFallback();
        SQL.FS.close(stream);
      }

      let db = new SQL.Database(
        path.includes('/blocked') ? path : SQL.FS.readlink(path),
        { filename: true },
      );
      db.exec(`
      PRAGMA journal_mode=MEMORY;
      PRAGMA cache_size=-10000;
    `);
      return db;
    }
  }

  return new SQL.Database();
}

export function closeDatabase(db) {
  db.close();
}

export function exportDatabase(db) {
  return db.export();
}
