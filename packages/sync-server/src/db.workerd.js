import { getWorkerdRuntime } from '#workerd/runtime';

// Durable Object SQLite implementation of the WrappedDatabase interface from
// ./db.js (better-sqlite3). Same synchronous API, with these differences
// papered over:
// - BEGIN/COMMIT can't be run as SQL; transactions go through transactionSync
//   (which nests as a savepoint, like better-sqlite3's transaction()).
// - `changes` comes from SELECT changes(); rowsWritten also counts index writes.
// - BLOBs come back as ArrayBuffer; callers expect Buffer.
// - undefined/boolean bindings are normalised the way better-sqlite3 would
//   need them to be passed.

// Whole-statement BEGIN/COMMIT inside multi-statement exec() strings
// (used by a couple of migrations).
const TRANSACTION_STATEMENT =
  /^\s*(BEGIN(\s+(DEFERRED|IMMEDIATE|EXCLUSIVE))?(\s+TRANSACTION)?|COMMIT(\s+TRANSACTION)?)\s*;/gim;

function toBinding(value) {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

function fromRow(row) {
  for (const key of Object.keys(row)) {
    if (row[key] instanceof ArrayBuffer) {
      row[key] = Buffer.from(row[key]);
    }
  }
  return row;
}

export class WrappedDatabase {
  /** @param {import('#workerd/runtime').DurableObjectStorageLike} storage */
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * @param {string} sql
   * @param {(string | number)[]} params
   */
  all(sql, params = []) {
    return this.storage.sql
      .exec(sql, ...params.map(toBinding))
      .toArray()
      .map(fromRow);
  }

  /**
   * @param {string} sql
   * @param {string[]} params
   */
  first(sql, params = []) {
    const rows = this.all(sql, params);
    return rows.length === 0 ? null : rows[0];
  }

  /**
   * @param {string} sql
   */
  exec(sql) {
    const withoutTransactionStatements = sql.replace(TRANSACTION_STATEMENT, '');
    if (withoutTransactionStatements !== sql) {
      this.transaction(() => {
        this.storage.sql.exec(withoutTransactionStatements);
      });
      return;
    }
    this.storage.sql.exec(sql);
  }

  /**
   * @param {string} sql
   * @param {(string | number | null | undefined)[]} params
   */
  mutate(sql, params = []) {
    if (/^\s*(BEGIN|COMMIT|END|ROLLBACK)\b/i.test(sql)) {
      throw new Error(
        `Raw "${sql.trim()}" is not supported on Durable Object SQLite; use transaction() instead`,
      );
    }
    this.storage.sql.exec(sql, ...params.map(toBinding));
    const { changes, insertId } = this.storage.sql
      .exec('SELECT changes() AS changes, last_insert_rowid() AS insertId')
      .one();
    return { changes, insertId };
  }

  /**
   * @param {() => void} fn
   */
  transaction(fn) {
    return this.storage.transactionSync(fn);
  }

  close() {
    // Durable Object storage has no handle to close.
  }
}

/**
 * The account database lives in the ActualServer Durable Object's own
 * SQLite, so every filename maps to it.
 *
 * @param {string} _filename
 */
export function openDatabase(_filename) {
  return new WrappedDatabase(getWorkerdRuntime().storage);
}
