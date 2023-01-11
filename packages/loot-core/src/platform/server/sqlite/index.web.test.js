import {
  init,
  openDatabase,
  transaction,
  execQuery,
  runQuery
} from './index.web';

beforeAll(() => {
  process.env.PUBLIC_URL =
    __dirname + '/../../../../../../node_modules/@jlongster/sql.js/dist/';
  return init();
});

let initSQL = `
CREATE TABLE numbers (id TEXT PRIMARY KEY, number INTEGER);
`;

describe('Web sqlite', () => {
  it('should rollback transactions', async () => {
    let db = await openDatabase();
    execQuery(db, initSQL);

    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    let rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(1);
    expect(rows[0].number).toBe(4);

    let consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
    expect(rows[0].number).toBe(4);
  });

  it('should support nested transactions', async () => {
    let db = await openDatabase();
    execQuery(db, initSQL);

    runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id1', 4)");

    let rows = runQuery(db, 'SELECT * FROM numbers', null, true);
    expect(rows.length).toBe(1);
    expect(rows[0].number).toBe(4);

    transaction(db, () => {
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id2', 5)");
      runQuery(db, "INSERT INTO numbers (id, number) VALUES ('id3', 6)");

      // Only this transaction should fail
      let consoleSpy = jest.spyOn(console, 'log').mockImplementation();
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
    expect(rows[0].number).toBe(4);
    expect(rows[1].number).toBe(5);
    expect(rows[2].number).toBe(6);
  });
});
