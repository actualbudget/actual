import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';

import { getCurrencyLineAccountIds } from './currencyLineAccounts';

function account(id: string, currency: string | null): AccountEntity {
  return { ...generateAccount(id), id, currency };
}

const accounts = [
  account('checking', null),
  account('savings', 'CAD'),
  account('bogota', 'COP'),
  account('medellin', 'COP'),
  account('chase', 'USD'),
];

const lines = [
  { id: 'food', currencyCode: 'CAD' },
  { id: 'food-COP', currencyCode: 'COP' },
  { id: 'food-USD', currencyCode: 'USD', startMonth: '2026-06' },
];

function accountIds(lineIndex: number, month: string) {
  return getCurrencyLineAccountIds({
    categoryId: 'food',
    line: lines[lineIndex],
    lines,
    month,
    accounts,
    defaultCurrencyCode: 'CAD',
  });
}

describe('getCurrencyLineAccountIds', () => {
  it('gives a currency line the accounts in its currency', () => {
    expect(accountIds(1, '2026-05')).toEqual(['bogota', 'medellin']);
  });

  it('gives the own line the accounts in the default currency, with or without one set', () => {
    expect(accountIds(0, '2026-06')).toEqual(['checking', 'savings']);
  });

  it('gives the own line the accounts of a currency whose line has not started yet', () => {
    expect(accountIds(0, '2026-05')).toEqual(['checking', 'savings', 'chase']);
  });
});
