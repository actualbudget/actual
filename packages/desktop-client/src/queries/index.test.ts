import { q } from '@actual-app/core/shared/query';

import { transactionsSearch } from './index';

describe('transactionsSearch', () => {
  it('searches text containing digits without matching amounts', () => {
    const query = transactionsSearch(
      q('transactions'),
      'XF 35mm',
      'yyyy-MM-dd',
    );

    expect(query.serialize().filterExpressions).toMatchObject([
      {
        $or: {
          notes: { $like: '%XF 35mm%' },
          'payee.name': { $like: '%XF 35mm%' },
          $or: [],
        },
      },
    ]);
  });

  it.each([
    ['35', 3500],
    ['$12.50', 1250],
  ])('still matches the amount for %s', (search, amount) => {
    const query = transactionsSearch(q('transactions'), search, 'yyyy-MM-dd');

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
