import { getAccountDb } from '../src/account-db';

export const up = async function () {
  const accountDb = getAccountDb();

  const admin = accountDb.first(
    'SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1',
    ['ADMIN'],
  );
  if (admin) {
    accountDb.mutate('UPDATE files SET owner = ? WHERE owner IS NULL', [
      admin.id,
    ]);
  }
};

export const down = async function () {
  // Cannot reliably restore NULL owner for backfilled rows; no-op.
};
