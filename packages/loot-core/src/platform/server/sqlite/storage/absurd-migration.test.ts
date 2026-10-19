import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  closeDatabase,
  execQuery,
  exportDatabase,
  init,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import {
  deleteLegacyDatabase,
  legacyDatabaseExists,
  pageSizeFromHeader,
  readLegacyDatabaseBytes,
  writeLegacyDatabaseBytes,
} from './absurd-migration';
import { StorageMigrationError } from './errors';
import { legacyDatabaseName } from './paths';
import { readSqliteWasm, seedLegacyDatabase } from './test-helpers';

const PATH = '/documents/Actual/My-Budget-abc123/db.sqlite';
const NAME = legacyDatabaseName(PATH);

async function makeDatabaseBytes(
  rows: number,
  rowLength = 8,
): Promise<Uint8Array> {
  const db = await openDatabase();
  execQuery(
    db,
    'CREATE TABLE __migrations__ (id INTEGER PRIMARY KEY); CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);',
  );
  for (let index = 0; index < rows; index++) {
    runQuery(db, 'INSERT INTO t (v) VALUES (?)', [
      ('row-' + index).padEnd(rowLength, 'x'),
    ]);
  }
  const bytes = await exportDatabase(db);
  closeDatabase(db);
  return bytes;
}

beforeAll(() => init({ storage: 'memory-idb', wasmBinary: readSqliteWasm() }));

beforeEach(() => {
  global.indexedDB = new IDBFactory();
});

describe('absurd-sql migration helpers', () => {
  it('derives the legacy database name from the path', () => {
    expect(NAME).toBe('documents-Actual-My-Budget-abc123-db.sqlite');
  });

  it('reads the page size from a sqlite header', async () => {
    const bytes = await makeDatabaseBytes(1);
    // Whatever the build's default is, it is a sqlite page size
    expect([512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]).toContain(
      pageSizeFromHeader(bytes),
    );
    expect(pageSizeFromHeader(new TextEncoder().encode('nope'))).toBe(null);
  });

  it('detects whether a legacy database exists', async () => {
    expect(await legacyDatabaseExists(NAME)).toBe(false);
    await seedLegacyDatabase(NAME, await makeDatabaseBytes(1));
    expect(await legacyDatabaseExists(NAME)).toBe(true);
  });

  it('reads a legacy database back byte for byte across several chunks', async () => {
    // Enough data for several hundred pages, so more than one chunk
    const bytes = await makeDatabaseBytes(3000, 1024);
    const pageSize = pageSizeFromHeader(bytes) ?? 4096;
    expect(bytes.length).toBeGreaterThan(256 * pageSize);
    await seedLegacyDatabase(NAME, bytes);

    const percents: number[] = [];
    const read = await readLegacyDatabaseBytes(PATH, NAME, percent =>
      percents.push(percent),
    );
    expect(read).not.toBeNull();
    expect(read?.length).toBe(bytes.length);
    expect(Buffer.from(read as Uint8Array).equals(Buffer.from(bytes))).toBe(
      true,
    );
    expect(percents[percents.length - 1]).toBe(100);

    // And it is a working database
    const db = await openDatabase(read as Uint8Array);
    expect(runQuery(db, 'SELECT count(*) AS n FROM t', [], true)).toEqual([
      { n: 3000 },
    ]);
    closeDatabase(db);
  });

  it('zero-fills missing blocks and truncates to the recorded size', async () => {
    const bytes = await makeDatabaseBytes(50);
    const pageSize = pageSizeFromHeader(bytes) ?? 4096;
    const lastBlock = Math.ceil(bytes.length / pageSize) - 1;
    await seedLegacyDatabase(NAME, bytes, { skipBlocks: [lastBlock] });

    const read = await readLegacyDatabaseBytes(PATH, NAME);
    expect(read?.length).toBe(bytes.length);
    const tail = (read as Uint8Array).subarray(lastBlock * pageSize);
    expect(tail.every(byte => byte === 0)).toBe(true);
  });

  it('returns null for a missing or empty legacy database', async () => {
    expect(await readLegacyDatabaseBytes(PATH, NAME)).toBeNull();
    await seedLegacyDatabase(NAME, new Uint8Array(0));
    expect(await readLegacyDatabaseBytes(PATH, NAME)).toBeNull();
    // The empty one is cleaned up
    expect(await legacyDatabaseExists(NAME)).toBe(false);
  });

  it('fails without touching the legacy data when the header is not sqlite', async () => {
    await seedLegacyDatabase(NAME, new TextEncoder().encode('x'.repeat(8192)));
    await expect(readLegacyDatabaseBytes(PATH, NAME)).rejects.toBeInstanceOf(
      StorageMigrationError,
    );
    expect(await legacyDatabaseExists(NAME)).toBe(true);
  });

  it('round-trips through the legacy layout and deletes it', async () => {
    const bytes = await makeDatabaseBytes(20);
    await writeLegacyDatabaseBytes(NAME, bytes);
    const read = await readLegacyDatabaseBytes(PATH, NAME);
    expect(Buffer.from(read as Uint8Array).equals(Buffer.from(bytes))).toBe(
      true,
    );

    expect(await deleteLegacyDatabase(NAME)).toBe(true);
    expect(await legacyDatabaseExists(NAME)).toBe(false);
  });
});
