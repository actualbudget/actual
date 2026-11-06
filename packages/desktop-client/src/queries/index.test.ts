import { q } from '@actual-app/core/shared/query';

import { transactionsSearch } from './index';

describe('transactionsSearch', () => {
  it.each(['XF 35mm', '12kr34'])(
    'searches %s as text without matching amounts',
    search => {
      const query = transactionsSearch(
        q('transactions'),
        search,
        'yyyy-MM-dd',
        'kr',
      );

      expect(query.serialize().filterExpressions).toMatchObject([
        {
          $or: {
            notes: { $like: `%${search}%` },
            'payee.name': { $like: `%${search}%` },
            $or: [],
          },
        },
      ]);
    },
  );

  it.each([
    ['35', '', 3500],
    ['$12.50', '$', 1250],
    ['12,50 kr', 'kr', 1250],
    ['chf 12.50', 'CHF', 1250],
  ])('still matches the amount for %s', (search, currencySymbol, amount) => {
    const query = transactionsSearch(
      q('transactions'),
      search,
      'yyyy-MM-dd',
      currencySymbol,
    );

    expect(query.serialize().filterExpressions).toMatchObject([
      {
        $or: {
          $or: expect.arrayContaining([
            { amount: { $transform: '$abs', $eq: amount } },
          ]),
        },
      },
    ]);
  });
});
