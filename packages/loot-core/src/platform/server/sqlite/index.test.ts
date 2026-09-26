// @ts-strict-ignore
import { patchFetchForSqlJS } from '#mocks/util';

import { execQuery, init, openDatabase, runQuery, transaction } from './index';

beforeAll(async () => {
  const baseURL = `${__dirname}/../../../../../../node_modules/@jlongster/sql.js/dist/`;
  patchFetchForSqlJS(baseURL);

  return init({ baseURL });
});

const initSQL = `
CREATE TABLE numbers (id TEXT PRIMARY KEY, number INTEGER);
CREATE TABLE textstrings (id TEXT PRIMARY KEY, string TEXT);
`;

describe('Web sqlite', () => {
  it('should rollback transactions', async () => {
    const db = await openDatabase();
    execQuery(db, initSQL);

    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    let rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(1);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[0].number).toBe(4);

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => null);
    expect(() => {
      transaction(db, () => {
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 5)");
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 6)");
        // Insert an invalid one that will error
        runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
      });
    }).toThrow(/constraint failed/);
    consoleSpy.mockRestore();

    // Nothing should have changed in the db
    rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(1);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[0].number).toBe(4);
  });

  it('should support nested transactions', async () => {
    const db = await openDatabase();
    execQuery(db, initSQL);

    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    let rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(1);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[0].number).toBe(4);

    transaction(db, () => {
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 5)");
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 6)");

      // Only this transaction should fail
      const consoleSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => null);
      expect(() => {
        transaction(db, () => {
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id4', 7)");
          // Insert an invalid one that will error
          runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 1)");
        });
      }).toThrow(/constraint failed/);
      consoleSpy.mockRestore();
    });

    // Nothing should have changed in the db
    rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(3);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[0].number).toBe(4);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[1].number).toBe(5);
    // @ts-expect-error Property 'number' does not exist on type 'unknown'
    expect(rows[2].number).toBe(6);
  });

  it('should use the crdt index for a batched cell lookup', async () => {
    // Mirrors the query `compareMessages` in server/sync builds for a
    // full chunk. If the planner ever falls back to a table scan on the
    // web build's SQLite, bulk edits get slow again.
    const db = await openDatabase();
    execQuery(
      db,
      `
      CREATE TABLE messages_crdt (
        id INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL UNIQUE,
        dataset TEXT NOT NULL,
        row TEXT NOT NULL,
        column TEXT NOT NULL,
        value BLOB NOT NULL
      );
      CREATE INDEX messages_crdt_search ON messages_crdt(dataset, row, column, timestamp);
      `,
    );

    const termCount = 100;
    const term = '(dataset = ? AND row = ? AND column = ? AND timestamp >= ?)';
    const sql =
      'SELECT dataset, row, column, timestamp FROM messages_crdt WHERE ' +
      Array(termCount).fill(term).join(' OR ');
    const params = Array.from({ length: termCount }, (_, index) => [
      'transactions',
      `row${index}`,
      'amount',
      '2024-01-01T00:00:00.000Z-0000-0000000000000000',
    ]).flat();

    const plan = runQuery<{ detail: string }>(
      db,
      'EXPLAIN QUERY PLAN ' + sql,
      params,
      true,
    );
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.some(step => step.detail.includes('SCAN'))).toBe(false);
    expect(
      plan.some(step => step.detail.includes('messages_crdt_search')),
    ).toBe(true);

    // And the query itself runs within the parameter limits
    expect(runQuery(db, sql, params, true)).toEqual([]);
  });

  it('should match regex on text fields', async () => {
    const db = await openDatabase();
    execQuery(db, initSQL);

    runQuery(
      db,
      "INSERT INTO textstrings (id, string) VALUES ('id1', 'not empty string')",
    );
    runQuery(db, "INSERT INTO textstrings (id) VALUES ('id2')");

    const rows = runQuery(
      db,
      'SELECT id FROM textstrings where REGEXP("n.", string)',
      null,
      true,
    );
    expect(rows.length).toBe(1);
    // @ts-expect-error Property 'id' does not exist on type 'unknown'
    expect(rows[0].id).toBe('id1');
  });
});
