import * as db from '../../db';

// This file doesn't test the schema code directly, it tests that
// views return data as expected and various constraints on the
// sqlite3 schema itself.

beforeEach(global.emptyDatabase());

describe('schema', () => {
  test('never returns transactions without a date', async () => {
    expect((await db.all('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
    await db.runQuery('INSERT INTO transactions (acct) VALUES (?)', ['foo']);
    expect((await db.all('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
  });

  test('never returns transactions without an account', async () => {
    expect((await db.all('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
    await db.runQuery('INSERT INTO transactions (date) VALUES (?)', [20200101]);
    expect((await db.all('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
  });

  test('never returns child transactions without a parent', async () => {
    expect((await db.all('SELECT * FROM transactions')).length).toBe(0);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
    await db.runQuery(
      'INSERT INTO transactions (date, acct, isChild) VALUES (?, ?, ?)',
      [20200101, 'foo', 1]
    );
    expect((await db.all('SELECT * FROM transactions')).length).toBe(1);
    expect((await db.all('SELECT * FROM v_transactions')).length).toBe(0);
  });
});
