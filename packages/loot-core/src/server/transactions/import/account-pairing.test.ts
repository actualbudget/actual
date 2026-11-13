import * as db from '#server/db';

import {
  findPairedAccount,
  hashAccountHint,
  pairAccountHint,
} from './account-pairing';

beforeEach(global.emptyDatabase());

const hint = { source: 'ofx', id: '012345678:123456789123' } as const;

describe('hashAccountHint', () => {
  test('is stable and does not expose the identifier', async () => {
    const first = await hashAccountHint(hint);
    expect(first).toBe(await hashAccountHint({ ...hint }));
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain('123456789123');
  });

  test('differs by source and by identifier', async () => {
    const base = await hashAccountHint(hint);
    expect(await hashAccountHint({ ...hint, source: 'qif' })).not.toBe(base);
    expect(await hashAccountHint({ ...hint, id: '012345678:1' })).not.toBe(
      base,
    );
  });
});

describe('account pairing', () => {
  beforeEach(async () => {
    await db.insertAccount({ id: 'one', name: 'one' });
    await db.insertAccount({ id: 'two', name: 'two' });
  });

  test('unknown identifier matches nothing', async () => {
    expect(await findPairedAccount(await hashAccountHint(hint))).toBeNull();
  });

  test('pairing is found afterwards', async () => {
    const hintId = await hashAccountHint(hint);
    expect(await pairAccountHint(hintId, 'one')).toEqual({
      previousAccountId: null,
    });
    expect(await findPairedAccount(hintId)).toBe('one');
  });

  test('pairing again with the same account is a no-op', async () => {
    const hintId = await hashAccountHint(hint);
    await pairAccountHint(hintId, 'one');
    expect(await pairAccountHint(hintId, 'one')).toEqual({
      previousAccountId: null,
    });
  });

  test('re-pairing overwrites and reports the previous account', async () => {
    const hintId = await hashAccountHint(hint);
    await pairAccountHint(hintId, 'one');
    expect(await pairAccountHint(hintId, 'two')).toEqual({
      previousAccountId: 'one',
    });
    expect(await findPairedAccount(hintId)).toBe('two');
    const rows = await db.all(
      'SELECT * FROM account_import_refs WHERE id = ?',
      [hintId],
    );
    expect(rows).toHaveLength(1);
  });

  test('an account can have several identifiers', async () => {
    const other = await hashAccountHint({ ...hint, id: '999:111' });
    await pairAccountHint(await hashAccountHint(hint), 'one');
    await pairAccountHint(other, 'one');
    expect(await findPairedAccount(other)).toBe('one');
    expect(await findPairedAccount(await hashAccountHint(hint))).toBe('one');
  });

  test('closed accounts are not matched but the pairing is kept', async () => {
    const hintId = await hashAccountHint(hint);
    await pairAccountHint(hintId, 'one');
    await db.update('accounts', { id: 'one', closed: 1 });
    expect(await findPairedAccount(hintId)).toBeNull();
    await db.update('accounts', { id: 'one', closed: 0 });
    expect(await findPairedAccount(hintId)).toBe('one');
  });

  test('deleted accounts are not matched', async () => {
    const hintId = await hashAccountHint(hint);
    await pairAccountHint(hintId, 'one');
    await db.deleteAccount({ id: 'one' });
    expect(await findPairedAccount(hintId)).toBeNull();
  });

  test('re-pairing from a deleted account reports no previous account', async () => {
    const hintId = await hashAccountHint(hint);
    await pairAccountHint(hintId, 'one');
    await db.deleteAccount({ id: 'one' });
    expect(await pairAccountHint(hintId, 'two')).toEqual({
      previousAccountId: null,
    });
    expect(await findPairedAccount(hintId)).toBe('two');
  });
});
