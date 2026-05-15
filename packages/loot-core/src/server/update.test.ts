import * as db from '#server/db';

import { updateVersion } from './update';

beforeEach(global.emptyDatabase());

const VIEWS = [
  'v_payees',
  'v_categories',
  'v_schedules',
  'v_transactions_internal',
  'v_transactions_internal_alive',
  'v_transactions',
];

describe('updateVersion (happy path via emptyDatabase)', () => {
  test('all configured views are created and queryable after init', async () => {
    for (const view of VIEWS) {
      // Throws if the view doesn't exist or its definition is invalid.
      const row = await db.first<Record<string, unknown>>(
        `SELECT * FROM ${view} LIMIT 1`,
      );
      // Either an empty result or a row — we just need the SELECT to succeed.
      expect(row === null || typeof row === 'object').toBe(true);
    }
  });

  test('view hash is stored in __meta__ after init', async () => {
    const row = await db.first<{ value: string }>(
      "SELECT value FROM __meta__ WHERE key = 'view-hash'",
    );
    expect(row?.value).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('updateViews (re-run behavior)', () => {
  test('is a no-op when the stored hash matches (does not change __meta__ row)', async () => {
    const before = await db.first<{ value: string }>(
      "SELECT value FROM __meta__ WHERE key = 'view-hash'",
    );

    await updateVersion();

    const after = await db.first<{ value: string }>(
      "SELECT value FROM __meta__ WHERE key = 'view-hash'",
    );
    expect(after?.value).toBe(before?.value);
  });

  test('recreates views when the stored hash differs', async () => {
    // Force a hash mismatch.
    await db.run("UPDATE __meta__ SET value = 'stale' WHERE key = 'view-hash'");

    await updateVersion();

    const after = await db.first<{ value: string }>(
      "SELECT value FROM __meta__ WHERE key = 'view-hash'",
    );
    expect(after?.value).not.toBe('stale');
    expect(after?.value).toMatch(/^[0-9a-f]{32}$/);

    // Views are still queryable after recreation.
    const row = await db.first<{ id: string }>(
      'SELECT * FROM v_payees LIMIT 1',
    );
    expect(row === null || typeof row === 'object').toBe(true);
  });
});

describe('probeViews (failure surfaces schema-out-of-sync)', () => {
  test('throws schema-out-of-sync with the failing view name when an underlying table is missing', async () => {
    // Simulate the #7710 desync: a migration was recorded as applied but the
    // table/column it created is gone. Dropping `schedules` makes `v_schedules`
    // unresolvable when probed, even though CREATE VIEW itself succeeds.
    db.execQuery('DROP TABLE schedules');
    await db.run("UPDATE __meta__ SET value = 'stale' WHERE key = 'view-hash'");

    await expect(updateVersion()).rejects.toThrow(/schema-out-of-sync/);
  });

  test('error message includes the view name and the underlying cause', async () => {
    db.execQuery('DROP TABLE schedules');
    await db.run("UPDATE __meta__ SET value = 'stale' WHERE key = 'view-hash'");

    let thrown: unknown;
    try {
      await updateVersion();
    } catch (e) {
      thrown = e;
    }
    if (!(thrown instanceof Error)) {
      throw new Error(
        `expected updateVersion to throw an Error, got: ${String(thrown)}`,
      );
    }
    expect(thrown.message).toContain('schema-out-of-sync');
    expect(thrown.message).toContain('v_schedules');
    expect(thrown.message.toLowerCase()).toContain('schedules');
  });

  test('does not throw when every view resolves cleanly (fresh DB)', async () => {
    // Force re-run of view creation + probe on a healthy DB.
    await db.run("UPDATE __meta__ SET value = 'stale' WHERE key = 'view-hash'");

    await expect(updateVersion()).resolves.toBeUndefined();
  });
});
