import type {
  AccountEntity,
  PayeeEntity,
  ScheduleEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';
import { describe, expect, test } from 'vitest';

import {
  inverseBasedOnAccount,
  isScheduleRelevantToAccount,
} from './useAccountPreviewTransactions';

function makeAccount(id: string): AccountEntity {
  return {
    id,
    name: id,
    offbudget: 0,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
    account_id: null,
    bank: null,
    bankName: null,
    bankId: null,
    mask: null,
    official_name: null,
    balance_current: null,
    balance_available: null,
    balance_limit: null,
    account_sync_source: null,
    last_sync: null,
    bank_sync_status: null,
    account_group_id: null,
  };
}

const checking = makeAccount('checking');
const savings = makeAccount('savings');
const unrelated = makeAccount('unrelated');

const payees: PayeeEntity[] = [
  { id: 'employer', name: 'Employer' },
  { id: 'insurance', name: 'Insurance' },
  { id: 'to-checking', name: 'Transfer: checking', transfer_acct: checking.id },
  { id: 'to-savings', name: 'Transfer: savings', transfer_acct: savings.id },
];

function getPayeeByTransferAccount(accountId?: string | null) {
  return payees.find(payee => payee.transfer_acct === accountId) || null;
}

function getTransferAccountByPayee(payeeId?: string | null) {
  const transferAccountId = payees.find(
    payee => payee.id === payeeId,
  )?.transfer_acct;
  return (
    [checking, savings, unrelated].find(
      account => account.id === transferAccountId,
    ) || null
  );
}

function makeSplitSchedule(): ScheduleEntity {
  return {
    id: 'paycheck',
    rule: 'paycheck-rule',
    next_date: '2026-08-15',
    completed: false,
    posts_transaction: true,
    tombstone: false,
    _payee: 'employer',
    _account: checking.id,
    _amount: -100_000,
    _amountOp: 'is',
    _date: '2026-08-15',
    _conditions: [],
    _actions: [
      {
        op: 'set',
        field: 'description',
        value: 'to-savings',
        options: { splitIndex: 2 },
      },
    ],
  };
}

describe('isScheduleRelevantToAccount', () => {
  test('includes a split schedule for its transfer destination', () => {
    expect(
      isScheduleRelevantToAccount({
        accountId: savings.id,
        schedule: makeSplitSchedule(),
        getTransferAccountByPayee,
      }),
    ).toBe(true);
  });

  test('excludes a split schedule from unrelated accounts', () => {
    expect(
      isScheduleRelevantToAccount({
        accountId: unrelated.id,
        schedule: makeSplitSchedule(),
        getTransferAccountByPayee,
      }),
    ).toBe(false);
  });
});

describe('inverseBasedOnAccount', () => {
  const parentId = 'preview/paycheck/2026-08-15';
  const transactions: TransactionEntity[] = [
    {
      id: parentId,
      account: checking.id,
      amount: -100_000,
      date: '2026-08-15',
      payee: 'employer',
      category: 'upcoming',
      is_parent: true,
      schedule: 'paycheck',
    },
    {
      id: 'preview/deduction',
      account: checking.id,
      amount: -60_000,
      date: '2026-08-15',
      payee: 'insurance',
      is_child: true,
      parent_id: parentId,
      schedule: 'paycheck',
    },
    {
      id: 'preview/savings-transfer',
      account: checking.id,
      amount: -40_000,
      date: '2026-08-15',
      payee: 'to-savings',
      category: 'old-category',
      is_child: true,
      parent_id: parentId,
      schedule: 'paycheck',
    },
  ];

  test('projects only the transfer child as a destination-account deposit', () => {
    const result = inverseBasedOnAccount({
      accountId: savings.id,
      transactions,
      startingBalance: 500_000,
      runningBalances: new Map(),
      getPayeeByTransferAccount,
      getTransferAccountByPayee,
    });

    expect(result.transactions).toEqual([
      expect.objectContaining({
        id: 'preview/savings-transfer',
        account: savings.id,
        amount: 40_000,
        payee: 'to-checking',
        category: 'upcoming',
        inversed: true,
      }),
    ]);
    expect(result.transactions[0]).not.toHaveProperty('is_child');
    expect(result.transactions[0]).not.toHaveProperty('parent_id');
    expect(result.runningBalances.get('preview/savings-transfer')).toBe(
      540_000,
    );
  });

  test('preserves the complete split in its source account', () => {
    const runningBalances = new Map([[parentId, 400_000]]);
    const result = inverseBasedOnAccount({
      accountId: checking.id,
      transactions,
      startingBalance: 500_000,
      runningBalances,
      getPayeeByTransferAccount,
      getTransferAccountByPayee,
    });

    expect(result.transactions.map(transaction => transaction.id)).toEqual(
      transactions.map(transaction => transaction.id),
    );
    expect(result.transactions[2]).toMatchObject({
      amount: -40_000,
      is_child: true,
      parent_id: parentId,
    });
    expect(result.runningBalances).toBe(runningBalances);
  });
});
