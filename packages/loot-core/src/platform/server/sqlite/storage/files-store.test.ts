import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';

import * as idb from '#platform/server/indexeddb';

import {
  findMigratedStorageKind,
  listSqliteFileRows,
  putSqliteFileRow,
} from './files-store';

beforeEach(async () => {
  global.indexedDB = new IDBFactory();
  await idb.closeDatabase();
  void idb.openDatabase();
});

describe('sqlite file rows', () => {
  it('finds no migrated storage among legacy markers', async () => {
    await putSqliteFileRow({
      filepath: '/documents/a/db.sqlite',
      contents: '',
    });
    expect(await listSqliteFileRows()).toEqual([]);
    expect(await findMigratedStorageKind()).toBeNull();
  });

  it('reports the fallback kind when only fallback rows exist', async () => {
    await putSqliteFileRow({
      filepath: '/documents/a/db.sqlite',
      contents: new Uint8Array(0),
      storage: 'memory-idb',
    });
    expect(await findMigratedStorageKind()).toBe('memory-idb');
  });

  it('prefers OPFS when both kinds of rows exist', async () => {
    await putSqliteFileRow({
      filepath: '/documents/a/db.sqlite',
      contents: new Uint8Array(0),
      storage: 'memory-idb',
    });
    await putSqliteFileRow({
      filepath: '/documents/b/db.sqlite',
      contents: '',
      storage: 'opfs',
    });
    expect(await findMigratedStorageKind()).toBe('opfs');
    expect(
      (await listSqliteFileRows()).map(row => row.filepath).sort(),
    ).toEqual(['/documents/a/db.sqlite', '/documents/b/db.sqlite']);
  });
});
