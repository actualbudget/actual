// @ts-strict-ignore
import * as db from '#server/db';

import {
  getAppliedMigrations,
  getMigrationList,
  getPending,
  migrate,
  withMigrationsDir,
} from './migrations';

beforeEach(global.emptyDatabase(true));

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

  test('tolerates migrations applied by a newer version of the app', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        await migrate(db.getDatabase());

        // Simulate a migration applied by a newer version of the app
        // (its id is newer than anything this version knows about)
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (9999999999999)');

        // Should not throw
        await migrate(db.getDatabase());

        const applied = await getAppliedMigrations(db.getDatabase());
        expect(applied).toContain(9999999999999);
      },
    );
  });

  test('rejects a newer unknown migration when a known one is missing', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // A database that skipped known migrations but somehow contains
        // one from a newer version — impossible via any legitimate flow
        // (append-only migrations mean the newer version knew ours too),
        // so it must be treated as corrupt, not migrated further
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (1508717984291)');
        db.runQuery('INSERT INTO __migrations__ (id) VALUES (9999999999999)');

        await expect(migrate(db.getDatabase())).rejects.toThrow(
          'out-of-sync-migrations',
        );
      },
    );
  });

  test('rejects a migrated database when no migrations exist on disk', async () => {
    await withMigrationsDir(__dirname + '/../../mocks/migrations', async () => {
      await migrate(db.getDatabase());
    });

    // A directory with no migration files in it — a broken install must
    // not pass validation just because every applied id looks "newer
    // than anything known"
    await withMigrationsDir(
      __dirname + '/../../mocks/empty-migrations',
      async () => {
        await expect(migrate(db.getDatabase())).rejects.toThrow(
          'out-of-sync-migrations',
        );
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
