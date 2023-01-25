import * as db from '../db';

import {
  migrate,
  withMigrationsDir,
  getAppliedMigrations,
  getMigrationList,
  getPending
} from './migrations';

beforeEach(global.emptyDatabase(true));

describe('Migrations', () => {
  test('gets the latest migrations', async () => {
    let applied = await getAppliedMigrations(db.getDatabase());
    let available = await getMigrationList(
      __dirname + '/../../mocks/migrations'
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

        let migrations = await getAppliedMigrations(db.getDatabase());
        let last = 0;
        for (let migration of migrations) {
          if (migration <= last) {
            throw new Error('Found older migration out of order');
          }
        }
      }
    );
  });

  test('checks if there are unknown migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        // Insert a random migration id
        await db.runQuery('INSERT INTO __migrations__ (id) VALUES (1000)');

        try {
          await migrate(db.getDatabase());
        } catch (e) {
          expect(e.message).toBe('out-of-sync-migrations');
          return;
        }
        expect('should never reach here').toBe(null);
      }
    );
  });

  test('app runs database migrations', async () => {
    return withMigrationsDir(
      __dirname + '/../../mocks/migrations',
      async () => {
        let desc = await db.first(
          "SELECT * FROM sqlite_master WHERE name = 'poop'"
        );
        expect(desc).toBe(null);

        await migrate(db.getDatabase());

        desc = await db.first(
          "SELECT * FROM sqlite_master WHERE name = 'poop'"
        );
        expect(desc).toBeDefined();
        expect(desc.sql.indexOf('is_income')).toBe(-1);
        expect(desc.sql.indexOf('is_expense')).not.toBe(-1);
      }
    );
  });
});
