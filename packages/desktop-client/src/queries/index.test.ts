import { q } from '@actual-app/core/shared/query';

import {
  accountFilter,
  transactionsSearch,
  uncategorizedTransactions,
} from './index';

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

describe('uncategorized filters', () => {
  const offBudgetTransfer = {
    'payee.transfer_acct.offbudget': true,
    'payee.transfer_acct': null,
  };

  it.each([undefined, 'envelope'] as const)(
    'counts transfers to off-budget accounts in a %s budget',
    budgetType => {
      expect(accountFilter('uncategorized', 'account', budgetType)).toEqual({
        'account.offbudget': false,
        category: null,
        is_parent: false,
        $or: [offBudgetTransfer],
      });
      expect(
        uncategorizedTransactions(budgetType).serialize().filterExpressions,
      ).toEqual([
        {
          'account.offbudget': false,
          category: null,
          $or: [offBudgetTransfer],
        },
      ]);
    },
  );

  it('leaves transfers to off-budget accounts out in a tracking budget', () => {
    expect(accountFilter('uncategorized', 'account', 'tracking')).toEqual({
      'account.offbudget': false,
      category: null,
      is_parent: false,
      'payee.transfer_acct': null,
    });
    expect(
      uncategorizedTransactions('tracking').serialize().filterExpressions,
    ).toEqual([
      {
        'account.offbudget': false,
        category: null,
        'payee.transfer_acct': null,
      },
    ]);
  });
});
