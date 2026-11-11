import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  hasMigratedSqliteFiles,
  listSqliteFileRows,
  putSqliteFileRow,
} from './files-store';
import { resetIndexedDb } from './test-helpers';

beforeEach(() => resetIndexedDb());

describe('sqlite file rows', () => {
  it('finds no migrated storage among legacy markers', async () => {
    await putSqliteFileRow({
      filepath: '/documents/a/db.sqlite',
      contents: '',
    });
    expect(await listSqliteFileRows()).toEqual([]);
    expect(await hasMigratedSqliteFiles()).toBe(false);
  });

  it('reports migrated data when only fallback rows exist', async () => {
    await putSqliteFileRow({
      filepath: '/documents/a/db.sqlite',
      contents: new Uint8Array(0),
      storage: 'memory-idb',
    });
    expect(await hasMigratedSqliteFiles()).toBe(true);
    expect(await hasMigratedSqliteFiles('opfs')).toBe(false);
  });

  it('reports migrated data when both kinds of rows exist', async () => {
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
    expect(await hasMigratedSqliteFiles()).toBe(true);
    expect(await hasMigratedSqliteFiles('opfs')).toBe(true);
    expect(
      (await listSqliteFileRows()).map(row => row.filepath).sort(),
    ).toEqual(['/documents/a/db.sqlite', '/documents/b/db.sqlite']);
  });
});
