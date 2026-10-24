import {
  closeDatabase,
  execQuery,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

describe('native SQLite binary query parameters', () => {
  it('still rejects typed values that are not byte arrays', async () => {
    const database = await openDatabase(':memory:');
    onTestFinished(() => closeDatabase(database));
    const parameters = [new Int16Array([65])];
    expect(() => {
      // @ts-expect-error Only unsigned byte arrays are valid SQL blobs.
      return runQuery(database, 'SELECT ?', parameters, true);
    }).toThrow('Invalid field type');
  });

  it('binds bytes as a blob without decoding a leading BOM', async () => {
    const database = await openDatabase(':memory:');
    onTestFinished(() => closeDatabase(database));
    const bytes = Uint8Array.of(0xef, 0xbb, 0xbf, 0x61);
    const rows = runQuery<{ kind: string; hex: string; bytes: Uint8Array }>(
      database,
      'SELECT typeof(?) AS kind, hex(?) AS hex, CAST(? AS BLOB) AS bytes',
      [bytes, bytes, bytes],
      true,
    );
    expect(rows[0].kind).toBe('blob');
    expect(rows[0].hex).toBe('EFBBBF61');
    expect(Array.from(rows[0].bytes)).toEqual([239, 187, 191, 97]);
  });

  it('advances a three-component keyset by original bytes', async () => {
    const database = await openDatabase(':memory:');
    onTestFinished(() => closeDatabase(database));
    execQuery(
      database,
      `CREATE TABLE rates (quote TEXT, timestamp TEXT, id TEXT);
       INSERT INTO rates VALUES ('EUR', '2026-03-01', 'a');
       INSERT INTO rates VALUES ('EUR', '2026-03-01', CAST(x'EFBBBF61' AS TEXT));
       INSERT INTO rates VALUES ('EUR', '2026-03-01', CAST(x'FF' AS TEXT));`,
    );
    const quote = new TextEncoder().encode('EUR');
    const timestamp = new TextEncoder().encode('2026-03-01');
    const rows = runQuery<{ id: string }>(
      database,
      `SELECT hex(CAST(id AS BLOB)) AS id FROM rates
       WHERE CAST(quote AS BLOB) > ? OR (CAST(quote AS BLOB) = ? AND
         (CAST(timestamp AS BLOB) < ? OR (CAST(timestamp AS BLOB) = ? AND CAST(id AS BLOB) > ?)))
       ORDER BY CAST(quote AS BLOB), CAST(timestamp AS BLOB) DESC, CAST(id AS BLOB)`,
      [quote, quote, timestamp, timestamp, Uint8Array.of(0x61)],
      true,
    );
    expect(rows).toEqual([{ id: 'EFBBBF61' }, { id: 'FF' }]);
  });
});
