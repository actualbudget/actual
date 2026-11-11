import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  closeDatabase,
  execQuery,
  exportDatabase,
  openDatabase,
  runQuery,
} from '#platform/server/sqlite';

import {
  completeMigration,
  deleteLegacyDatabase,
  legacySnapshot,
  pageSizeFromHeader,
  readLegacyDatabaseBytes,
} from './absurd-migration';
import { BudgetInUseError, StorageMigrationError } from './errors';
import { getSqliteFileRow, putSqliteFileRow } from './files-store';
import { legacyDatabaseName } from './paths';
import {
  initWasmEngine,
  listIndexedDbNames,
  resetIndexedDb,
  seedLegacyDatabase,
} from './test-helpers';

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

// Another tab's absurd-sql connection, which closes on a version change
// unless told to stay
function holdLegacyConnection(
  name: string,
  { stubborn = false } = {},
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 2);
    request.onsuccess = () => {
      const database = request.result;
      if (!stubborn) {
        database.onversionchange = () => database.close();
      }
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

async function legacyVersion(name: string): Promise<number | undefined> {
  return (await indexedDB.databases()).find(database => database.name === name)
    ?.version;
}

beforeAll(() => initWasmEngine());

beforeEach(() => resetIndexedDb());

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
    // The right magic bytes with an impossible page size
    const broken = bytes.slice(0, 100);
    broken[16] = 0;
    broken[17] = 0;
    expect(pageSizeFromHeader(broken)).toBe(null);
    broken[17] = 3;
    expect(pageSizeFromHeader(broken)).toBe(null);
    // In range but not a power of two (1000)
    broken[16] = 0x03;
    broken[17] = 0xe8;
    expect(pageSizeFromHeader(broken)).toBe(null);
  });

  it('reads a legacy database back byte for byte across several chunks', async () => {
    // Enough data for several hundred pages, so more than one chunk
    const bytes = await makeDatabaseBytes(3000, 1024);
    const pageSize = pageSizeFromHeader(bytes) ?? 4096;
    expect(bytes.length).toBeGreaterThan(256 * pageSize);
    await seedLegacyDatabase(NAME, bytes);

    const percents: number[] = [];
    const read = await readLegacyDatabaseBytes(PATH, percent =>
      percents.push(percent),
    );
    expect(read).not.toBeNull();
    expect(read?.length).toBe(bytes.length);
    expect(Buffer.from(read as Uint8Array).equals(Buffer.from(bytes))).toBe(
      true,
    );
    expect(percents[0]).toBe(0);
    expect(percents[percents.length - 1]).toBe(100);

    // And it is a working database
    const db = await openDatabase(read as Uint8Array);
    expect(runQuery(db, 'SELECT count(*) AS n FROM t', [], true)).toEqual([
      { n: 3000 },
    ]);
    closeDatabase(db);

    expect(await deleteLegacyDatabase(NAME)).toBe(true);
    expect(await listIndexedDbNames()).not.toContain(NAME);
  });

  it('zero-fills missing blocks and truncates to the recorded size', async () => {
    const bytes = await makeDatabaseBytes(50);
    const pageSize = pageSizeFromHeader(bytes) ?? 4096;
    const lastBlock = Math.ceil(bytes.length / pageSize) - 1;
    await seedLegacyDatabase(NAME, bytes, { skipBlocks: [lastBlock] });

    const read = await readLegacyDatabaseBytes(PATH);
    expect(read?.length).toBe(bytes.length);
    const tail = (read as Uint8Array).subarray(lastBlock * pageSize);
    expect(tail.every(byte => byte === 0)).toBe(true);
  });

  it('returns null for a missing or empty legacy database', async () => {
    expect(await readLegacyDatabaseBytes(PATH)).toBeNull();
    // Looking did not create one
    expect(await listIndexedDbNames()).not.toContain(NAME);
    await seedLegacyDatabase(NAME, new Uint8Array(0));
    expect(await readLegacyDatabaseBytes(PATH)).toBeNull();
    // The empty one is cleaned up
    expect(await listIndexedDbNames()).not.toContain(NAME);
  });

  it('keeps a legacy database whose size metadata is damaged', async () => {
    await seedLegacyDatabase(NAME, await makeDatabaseBytes(5));
    const database = await holdLegacyConnection(NAME);
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('data', 'readwrite');
      transaction.objectStore('data').delete(-1);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();

    await expect(readLegacyDatabaseBytes(PATH)).rejects.toBeInstanceOf(
      StorageMigrationError,
    );
    expect(await listIndexedDbNames()).toContain(NAME);
  });

  it('closes other connections to the legacy database before copying it', async () => {
    const bytes = await makeDatabaseBytes(5);
    await seedLegacyDatabase(NAME, bytes);
    const other = await holdLegacyConnection(NAME);
    let closed = false;
    other.addEventListener('close', () => {
      closed = true;
    });
    const previous = other.onversionchange;
    other.onversionchange = event => {
      closed = true;
      previous?.call(other, event);
    };

    expect((await readLegacyDatabaseBytes(PATH))?.length).toBe(bytes.length);
    expect(closed).toBe(true);
    // The version never moved, so the legacy engine could still open it
    expect(await legacyVersion(NAME)).toBe(2);
  });

  it('reports the budget in use when a connection will not close', async () => {
    await seedLegacyDatabase(NAME, await makeDatabaseBytes(5));
    const other = await holdLegacyConnection(NAME, { stubborn: true });
    try {
      await expect(readLegacyDatabaseBytes(PATH)).rejects.toBeInstanceOf(
        BudgetInUseError,
      );
      expect(await legacyVersion(NAME)).toBe(2);
    } finally {
      other.close();
    }
  });

  it('reports the budget in use when nothing answers the version change', async () => {
    await seedLegacyDatabase(NAME, await makeDatabaseBytes(5));
    // A connection in a worker that never reaches its event loop never
    // acknowledges the version change, and the browser reports `blocked`
    // only once every connection has: the open request just stays pending
    const realOpen = indexedDB.open.bind(indexedDB);
    const open = vi
      .spyOn(indexedDB, 'open')
      .mockImplementation((name, version) =>
        version == null ? realOpen(name) : ({} as unknown as IDBOpenDBRequest),
      );
    vi.useFakeTimers();
    try {
      const pending = readLegacyDatabaseBytes(PATH);
      pending.catch(() => undefined);
      await vi.advanceTimersByTimeAsync(5000);
      await expect(pending).rejects.toBeInstanceOf(BudgetInUseError);
    } finally {
      vi.useRealTimers();
      open.mockRestore();
    }
    expect(await legacyVersion(NAME)).toBe(2);
  });

  it('refuses the cutover when a connection to the copy appeared meanwhile', async () => {
    const bytes = await makeDatabaseBytes(5);
    await seedLegacyDatabase(NAME, bytes);
    const other = await holdLegacyConnection(NAME, { stubborn: true });
    try {
      await expect(
        completeMigration(
          { filepath: PATH, contents: '', storage: 'opfs' },
          0,
          legacySnapshot(bytes),
        ),
      ).rejects.toBeInstanceOf(BudgetInUseError);
    } finally {
      other.close();
    }
    expect(await getSqliteFileRow(PATH)).toBeUndefined();
    expect(await listIndexedDbNames()).toContain(NAME);
  });

  it('refuses the cutover when another worker moved the budget first', async () => {
    const bytes = await makeDatabaseBytes(5);
    await seedLegacyDatabase(NAME, bytes);
    await putSqliteFileRow({
      filepath: PATH,
      contents: new Uint8Array([1]),
      storage: 'memory-idb',
      rev: 1,
    });
    await expect(
      completeMigration(
        { filepath: PATH, contents: '', storage: 'opfs' },
        0,
        legacySnapshot(bytes),
      ),
    ).rejects.toBeInstanceOf(BudgetInUseError);
    expect((await getSqliteFileRow(PATH))?.storage).toBe('memory-idb');
    expect(await listIndexedDbNames()).toContain(NAME);
  });

  it('refuses the cutover when the copy changed after the snapshot', async () => {
    const bytes = await makeDatabaseBytes(5);
    await seedLegacyDatabase(NAME, bytes);
    const snapshot = legacySnapshot(bytes);
    // A tab on the previous release reopens the copy and writes, which
    // moves the file change counter in the header
    const other = await holdLegacyConnection(NAME);
    await new Promise<void>((resolve, reject) => {
      const transaction = other.transaction('data', 'readwrite');
      const store = transaction.objectStore('data');
      const request = store.get(0);
      request.onsuccess = () => {
        const block = new Uint8Array(request.result as ArrayBuffer);
        block[27] += 1;
        store.put(block.buffer, 0);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    other.close();

    await expect(
      completeMigration(
        { filepath: PATH, contents: '', storage: 'opfs' },
        0,
        snapshot,
      ),
    ).rejects.toBeInstanceOf(BudgetInUseError);
    expect(await getSqliteFileRow(PATH)).toBeUndefined();
    expect(await listIndexedDbNames()).toContain(NAME);
    expect(await legacyVersion(NAME)).toBe(2);
  });

  it('fails without touching the legacy data when the header is not sqlite', async () => {
    await seedLegacyDatabase(NAME, new TextEncoder().encode('x'.repeat(8192)));
    await expect(readLegacyDatabaseBytes(PATH)).rejects.toBeInstanceOf(
      StorageMigrationError,
    );
    // Still there, at the version absurd-sql opens it with
    const legacy = (await indexedDB.databases()).find(
      database => database.name === NAME,
    );
    expect(legacy?.version).toBe(2);
  });
});
