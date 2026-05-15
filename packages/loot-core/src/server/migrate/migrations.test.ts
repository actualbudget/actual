// @ts-strict-ignore
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin } from 'node:path';

import * as fs from '#platform/server/fs';
import * as db from '#server/db';

import {
  applyMigration,
  getAppliedMigrations,
  getMigrationList,
  getMigrationsDir,
  getPending,
  getUpMigration,
  migrate,
  withMigrationsDir,
} from './migrations';

beforeEach(global.emptyDatabase(true));

function makeTempMigrationsDir(prefix: string): string {
  return mkdtempSync(pathJoin(tmpdir(), prefix));
}

describe('Migrations', () => {
  test('gets the latest migrations', async () => {
    const applied = await getAppliedMigrations(db.getDatabase());
    const available = await getMigrationList(
      __dirname + '/../../mocks/migrations',
    );

    expect(applied.length).toBe(0);
    expect(available).toMatchSnapshot();
    expect(getPending(applied, available)).toMatchSnapshot();
  });

  test('default migrations list is sorted by id and includes the latest sql migration', async () => {
    const available = await getMigrationList(fs.migrationsPath);

    expect(available).toContain('1769000000000_add_custom_upcoming_length.sql');
    const ids = available.map(name => parseInt(name));
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  test('applied migrations are returned in order', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        await migrate(db.getDatabase());

        const migrations = await getAppliedMigrations(db.getDatabase());
        const last = 0;
        for (const migration of migrations) {
          if (migration <= last) {
            throw new Error('Found older migration out of order');
          }
        }
      },
    );
  });

  test('checks if there are unknown migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Insert a random migration id
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1000)');

        try {
          await migrate(db.getDatabase());
        } catch (e) {
          expect(e.message).toBe('out-of-sync-migrations');
          return;
        }
        expect('should never reach here').toBe(null);
      },
    );
  });

  test('app runs database migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        let desc = await db.first<{ sql: string }>(
          "SELECT * FROM sqlite_master WHERE name = 'poop'",
        );
        expect(desc).toBe(null);

        await migrate(db.getDatabase());

        desc = await db.first<{ sql: string }>(
          "SELECT * FROM sqlite_master WHERE name = 'poop'",
        );
        expect(desc).toBeDefined();
        expect(desc.sql.indexOf('is_income')).toBe(-1);
        expect(desc.sql.indexOf('is_expense')).not.toBe(-1);
      },
    );
  });
});

describe('getUpMigration', () => {
  test('returns the matching name', () => {
    const names = ['1000_a.sql', '2000_b.sql', '3000_c.js'];
    expect(getUpMigration(2000, names)).toBe('2000_b.sql');
    expect(getUpMigration(3000, names)).toBe('3000_c.js');
  });

  test('returns undefined when no name matches', () => {
    expect(getUpMigration(9999, ['1000_a.sql'])).toBeUndefined();
    expect(getUpMigration(1, [])).toBeUndefined();
  });
});

describe('getPending', () => {
  const all = ['1000_a.sql', '2000_b.sql', '3000_c.sql'];

  test('returns names whose ids are not in applied', () => {
    expect(getPending([1000], all)).toEqual(['2000_b.sql', '3000_c.sql']);
  });

  test('returns empty when all are applied', () => {
    expect(getPending([1000, 2000, 3000], all)).toEqual([]);
  });

  test('returns full list when none are applied', () => {
    expect(getPending([], all)).toEqual(all);
  });

  test('ignores applied ids that are not in the available list', () => {
    expect(getPending([1000, 9999], all)).toEqual(['2000_b.sql', '3000_c.sql']);
  });
});

describe('getMigrationList', () => {
  test('sorts numerically, not lexically, for mixed-length ids', async () => {
    const dir = makeTempMigrationsDir('mig-sort-');
    // Lexical sort would put "100" before "9"; numeric sort puts "9" first.
    writeFileSync(pathJoin(dir, '9_short.sql'), '');
    writeFileSync(pathJoin(dir, '100_long.sql'), '');
    writeFileSync(pathJoin(dir, '1000_longer.sql'), '');

    const list = await getMigrationList(dir);

    expect(list).toEqual(['9_short.sql', '100_long.sql', '1000_longer.sql']);
  });

  test('filters out files that are not .sql or .js', async () => {
    const dir = makeTempMigrationsDir('mig-filter-');
    writeFileSync(pathJoin(dir, '1_keep.sql'), '');
    writeFileSync(pathJoin(dir, '2_keep.js'), 'export default function() {}');
    writeFileSync(pathJoin(dir, '3_ignore.txt'), '');
    writeFileSync(pathJoin(dir, '4_ignore.md'), '');
    writeFileSync(pathJoin(dir, '.force-copy-windows'), '');

    const list = await getMigrationList(dir);

    expect(list).toEqual(['1_keep.sql', '2_keep.js']);
  });
});

describe('withMigrationsDir', () => {
  test('restores the previous dir after the callback resolves', async () => {
    const before = getMigrationsDir();

    await withMigrationsDir('/tmp/whatever', async () => {
      expect(getMigrationsDir()).toBe('/tmp/whatever');
    });

    expect(getMigrationsDir()).toBe(before);
  });

  // TDD placeholder for a follow-up that wraps `withMigrationsDir` in
  // try/finally. Today a throwing callback leaks MIGRATIONS_DIR into the
  // rest of the suite — enable this test alongside the fix.
  test.skip('restores the previous dir when the callback throws', async () => {
    const before = getMigrationsDir();

    await expect(
      withMigrationsDir('/tmp/whatever', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(getMigrationsDir()).toBe(before);
  });
});

describe('applyMigration', () => {
  test('SQL path applies the SQL and records the id', async () => {
    expect(await getAppliedMigrations(db.getDatabase())).toEqual([]);

    // 1548957970627_remove-db-version.sql drops the db_version table.
    await applyMigration(
      db.getDatabase(),
      '1548957970627_remove-db-version.sql',
      fs.migrationsPath,
    );

    const tbl = await db.first<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name = 'db_version'",
    );
    expect(tbl).toBe(null);

    expect(await getAppliedMigrations(db.getDatabase())).toEqual([
      1548957970627,
    ]);
  });

  test('SQL path propagates SQLite errors and skips recording the id', async () => {
    const dir = makeTempMigrationsDir('mig-bad-');
    writeFileSync(pathJoin(dir, '1_broken.sql'), 'THIS IS NOT VALID SQL;');

    await expect(
      applyMigration(db.getDatabase(), '1_broken.sql', dir),
    ).rejects.toThrow();

    expect(await getAppliedMigrations(db.getDatabase())).toEqual([]);
  });
});

describe('migrate (end-to-end)', () => {
  test('applies every migration on a fresh init.sql DB', async () => {
    const pending = await migrate(db.getDatabase());

    expect(pending.length).toBeGreaterThan(0);

    const applied = await getAppliedMigrations(db.getDatabase());
    expect(applied.length).toBe(pending.length);

    // Both JS and SQL migrations executed.
    expect(applied).toContain(1632571489012); // JS
    expect(applied).toContain(1769000000000); // SQL: custom_upcoming_length

    // The column the JS migration creates exists in the database.
    const zb = await db.first<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE name = 'zero_budget_months'",
    );
    expect(zb.name).toBe('zero_budget_months');

    // The column the latest SQL migration adds exists.
    const cols = await db.all<{ name: string }>(
      "PRAGMA table_info('schedules')",
    );
    expect(cols.map(c => c.name)).toContain('custom_upcoming_length');
  });

  test('returns an empty pending list on the second invocation (idempotent)', async () => {
    await migrate(db.getDatabase());
    const second = await migrate(db.getDatabase());
    expect(second).toEqual([]);
  });
});

describe('patchBadMigrations', () => {
  test('replaces the bad-filters id with the new-filters id before validity check', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Inject the bad id. The mock dir doesn't contain either id, so the
        // only way patching can avoid an "out-of-sync" throw is by removing
        // the bad id (and inserting the new one, which we also assert isn't
        // tripping validity below because it's not in available either).
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1685375406832)');

        // The new id (1688749527273) gets inserted by patchBadMigrations.
        // Neither id is in the mock available list, so validity will still
        // complain — assert via the patched table state directly.
        await migrate(db.getDatabase()).catch(() => {
          // expected: validity throws because 1688749527273 isn't in mocks
        });

        const ids = await getAppliedMigrations(db.getDatabase());
        expect(ids).not.toContain(1685375406832);
        expect(ids).toContain(1688749527273);
      },
    );
  });

  test('is a no-op when the bad id is not in __migrations__', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        await migrate(db.getDatabase());
        const ids = await getAppliedMigrations(db.getDatabase());
        expect(ids).not.toContain(1685375406832);
        expect(ids).not.toContain(1688749527273);
      },
    );
  });
});

describe('checkDatabaseValidity (via migrate)', () => {
  test('throws when more migrations are recorded than are available', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Mock dir has 3 migrations. Insert 4 unrelated ids → applied.length
        // (4) > available.length (3) → length-branch throw.
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (2)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (3)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (4)');

        await expect(migrate(db.getDatabase())).rejects.toThrow(
          'out-of-sync-migrations',
        );
      },
    );
  });

  test('throws on id mismatch even when counts match', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Same count as available (3) but the ids don't line up.
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (2)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (3)');

        await expect(migrate(db.getDatabase())).rejects.toThrow(
          'out-of-sync-migrations',
        );
      },
    );
  });
});
