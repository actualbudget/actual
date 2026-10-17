import { q } from '@actual-app/core/shared/query';
import { describe, expect, it } from 'vitest';

import { transactionsSearch } from './index';

const dateFormat = 'yyyy-MM-dd';

function amountFilters(search: string) {
  const query = transactionsSearch(q('transactions'), search, dateFormat);
  const filter = query.serialize().filterExpressions[0].$or as {
    $or: Array<{ amount?: unknown } | false>;
  };

  return filter.$or.filter(clause => clause && 'amount' in clause);
}

describe('transactionsSearch', () => {
  it('does not treat digits inside a word as an amount', () => {
    expect(amountFilters('XF 35mm')).toEqual([]);
    expect(amountFilters('35mm')).toEqual([]);
    expect(amountFilters('a2b2c7d')).toEqual([]);
    expect(amountFilters('dafasdfasd213sdaffsadf')).toEqual([]);
  });

  it('still matches a plain amount', () => {
    const filters = amountFilters('35');

    expect(filters).toEqual([
      { amount: { $transform: '$abs', $eq: 3500 } },
      {
        amount: {
          $transform: { $abs: { $idiv: ['$', 100] } },
          $eq: 35,
        },
      },
    ]);
  });

  it('still matches an amount with a currency symbol or cents', () => {
    expect(amountFilters('$12.50')).toEqual([
      { amount: { $transform: '$abs', $eq: 1250 } },
    ]);
  });

  it('keeps searching notes and payees for the original text', () => {
    const query = transactionsSearch(q('transactions'), 'XF 35mm', dateFormat);
    const filter = query.serialize().filterExpressions[0].$or as {
      notes: { $like: string };
      'payee.name': { $like: string };
    };

    expect(filter.notes).toEqual({ $like: '%XF 35mm%' });
    expect(filter['payee.name']).toEqual({ $like: '%XF 35mm%' });
  });
});
