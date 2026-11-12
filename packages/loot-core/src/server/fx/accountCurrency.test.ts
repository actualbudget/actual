import * as db from '#server/db';
import { loadMappings } from '#server/db/mappings';

import { checkAccountCurrencyChange } from './accountCurrency';

beforeEach(async () => {
  await global.emptyDatabase()();
  await loadMappings();
});

async function insertAccountWithTransaction(currency: string | null) {
  await db.insertAccount({ id: 'acct', name: 'Account', currency });
  await db.insertTransaction({
    account: 'acct',
    amount: 150000,
    date: '2026-10-01',
  });
}

describe('checkAccountCurrencyChange', () => {
  it.each([
    [null, 'USD'],
    ['USD', 'CAD'],
    ['USD', null],
    // Every currency is stored at the same scale, so currencies with other
    // decimal places only relabel the amounts too
    [null, 'JPY'],
    ['JPY', 'USD'],
    ['KRW', null],
  ])(
    'allows changing %s to %s on an account with transactions',
    async (from, to) => {
      await insertAccountWithTransaction(from);

      await expect(checkAccountCurrencyChange('acct', to)).resolves.toBe(true);
    },
  );

  it.each([
    [null, null],
    ['USD', 'USD'],
    ['JPY', 'JPY'],
  ])('keeps %s when given %s', async (from, to) => {
    await insertAccountWithTransaction(from);

    await expect(checkAccountCurrencyChange('acct', to)).resolves.toBe(false);
  });

  it('refuses unsupported currencies', async () => {
    await db.insertAccount({ id: 'acct', name: 'Account' });

    await expect(checkAccountCurrencyChange('acct', 'XYZ')).rejects.toThrow(
      /unsupported currency/,
    );
  });

  it('refuses accounts that do not exist', async () => {
    await db.insertAccount({ id: 'deleted', name: 'Deleted' });
    await db.deleteAccount({ id: 'deleted' });

    await expect(checkAccountCurrencyChange('missing', 'USD')).rejects.toThrow(
      /does not exist/,
    );
    await expect(checkAccountCurrencyChange('deleted', 'USD')).rejects.toThrow(
      /does not exist/,
    );
  });
});
