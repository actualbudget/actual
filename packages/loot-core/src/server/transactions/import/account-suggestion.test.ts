import * as db from '#server/db';

import {
  findSuggestedAccount,
  merchantKey,
  suggestAccount,
} from './account-suggestion';
import type { AccountEvidence } from './account-suggestion';

const evidence = (
  importedIdMatches: number,
  merchants: string[],
): AccountEvidence => ({ importedIdMatches, merchants: new Set(merchants) });

describe('merchantKey', () => {
  test('ignores digits, case, punctuation and spacing', () => {
    expect(merchantKey('STARBUCKS STORE 07604 01/21 PURC')).toBe(
      'starbucks store purc',
    );
    expect(merchantKey('  Corner   Cafe ')).toBe('corner cafe');
  });

  test('drops values too short or empty to mean anything', () => {
    expect(merchantKey('A1')).toBeNull();
    expect(merchantKey('')).toBeNull();
    expect(merchantKey(null)).toBeNull();
  });
});

describe('suggestAccount', () => {
  test('suggests the only account that has seen the merchants', () => {
    const result = suggestAccount(
      new Set(['corner cafe', 'grocery store']),
      new Map([
        ['a', evidence(0, ['corner cafe', 'grocery store'])],
        ['b', evidence(0, ['gas station'])],
      ]),
    );
    expect(result).toBe('a');
  });

  test('says nothing when every account has seen the same merchants', () => {
    const result = suggestAccount(
      new Set(['corner cafe', 'grocery store', 'gas station']),
      new Map([
        ['a', evidence(0, ['corner cafe', 'grocery store', 'gas station'])],
        ['b', evidence(0, ['corner cafe', 'grocery store', 'gas station'])],
      ]),
    );
    expect(result).toBeNull();
  });

  test('says nothing below the minimum evidence', () => {
    const result = suggestAccount(
      new Set(['corner cafe']),
      new Map([['a', evidence(0, ['corner cafe'])]]),
    );
    expect(result).toBeNull();
  });

  test('weights merchants unique to one account above shared ones', () => {
    const result = suggestAccount(
      new Set(['shared one', 'shared two', 'mine one', 'mine two', 'mine 3']),
      new Map([
        ['a', evidence(0, ['shared one', 'shared two'])],
        [
          'b',
          evidence(0, ['shared one', 'shared two', 'mine one', 'mine two']),
        ],
      ]),
    );
    expect(result).toBe('b');
  });

  test('already imported ids win over merchants', () => {
    const result = suggestAccount(
      new Set(['corner cafe', 'grocery store', 'gas station']),
      new Map([
        ['a', evidence(0, ['corner cafe', 'grocery store', 'gas station'])],
        ['b', evidence(3, [])],
      ]),
    );
    expect(result).toBe('b');
  });

  test('ids found in several accounts equally give no id-based answer', () => {
    const result = suggestAccount(
      new Set(),
      new Map([
        ['a', evidence(2, [])],
        ['b', evidence(2, [])],
      ]),
    );
    expect(result).toBeNull();
  });
});

describe('findSuggestedAccount', () => {
  beforeEach(global.emptyDatabase());

  async function addTransaction(
    account: string,
    payeeName: string,
    extra: Record<string, unknown> = {},
  ) {
    const payee = await db.insertPayee({ name: payeeName });
    await db.insertTransaction({
      account,
      payee,
      amount: -1000,
      // Tests run with the clock pinned to 2017-01-01.
      date: '2016-12-01',
      ...extra,
    });
  }

  beforeEach(async () => {
    await db.insertAccount({ id: 'one', name: 'one' });
    await db.insertAccount({ id: 'two', name: 'two' });
  });

  test('suggests the account whose history contains the merchants', async () => {
    await addTransaction('one', 'Corner Cafe');
    await addTransaction('one', 'Grocery Store');
    await addTransaction('two', 'Gas Station');

    expect(
      await findSuggestedAccount([
        { payee_name: 'CORNER CAFE 123' },
        { imported_payee: 'Grocery Store #9' },
      ]),
    ).toBe('one');
  });

  test('ignores closed accounts and transactions older than a year', async () => {
    await addTransaction('one', 'Corner Cafe', { date: '2014-01-01' });
    await addTransaction('one', 'Grocery Store', { date: '2014-01-01' });
    await db.insertAccount({ id: 'old', name: 'old', closed: 1 });
    await addTransaction('old', 'Corner Cafe');
    await addTransaction('old', 'Grocery Store');

    expect(
      await findSuggestedAccount([
        { payee_name: 'Corner Cafe' },
        { payee_name: 'Grocery Store' },
      ]),
    ).toBeNull();
  });

  test('an imported id already in an account is enough', async () => {
    await addTransaction('two', 'Gas Station', { imported_id: 'fit-1' });

    expect(await findSuggestedAccount([{ imported_id: 'fit-1' }])).toBe('two');
  });

  test('suggests nothing for a file with no usable payees or ids', async () => {
    expect(await findSuggestedAccount([{}])).toBeNull();
    expect(await findSuggestedAccount([])).toBeNull();
  });
});
