import { generateAccount } from '@actual-app/core/mocks';
import type {
  AccountEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import {
  deserializeTransaction,
  editableForeignPatch,
  editorHiddenAccounts,
  reencodeAmount,
  rulePreviewFields,
  serializeTransaction,
} from './TransactionEdit';

const transaction: TransactionEntity = {
  id: 'tx',
  account: 'account',
  date: '2026-09-23',
  amount: -1234,
  cleared: false,
};

it.each([
  [0, -1234],
  [2, -12.34],
  [3, -1.234],
] as const)('round trips mobile major units at %sdp', (precision, major) => {
  const edit = serializeTransaction(transaction, 'MM/dd/yyyy', precision);
  expect(edit.amount).toBe(major);
  expect(
    deserializeTransaction(edit, transaction, 'MM/dd/yyyy', precision).amount,
  ).toBe(-1234);
  expect(
    deserializeTransaction(
      { ...edit, amount: Infinity },
      transaction,
      'MM/dd/yyyy',
      precision,
    ).amount,
  ).toBe(-1234);
});

describe('foreign entry helpers', () => {
  const account = (
    id: string,
    currency: string | null,
    currency_precision: number | null,
  ): AccountEntity => ({
    ...generateAccount(id),
    id,
    currency,
    currency_precision,
  });
  const all = [
    account('usd', null, null),
    account('jpy', 'JPY', 0),
    account('jpy2', 'JPY', 0),
    account('kwd', 'KWD', 3),
  ];

  it.each([
    [1500, 2, 0, 15],
    [15, 0, 2, 1500],
    [1235, 3, 2, null],
    [123, 2, 0, null],
    [Number.MAX_SAFE_INTEGER, 0, 3, null],
  ] as const)(
    're-encodes %s from %sdp to %sdp as %s',
    (amount, from, to, expected) => {
      expect(reencodeAmount(amount, from, to)).toBe(expected);
    },
  );

  it('drops the stored pair from an existing foreign patch', () => {
    expect(
      editableForeignPatch({
        id: 'tx',
        notes: 'n',
        amount: -1,
        transaction_amount: -2,
        account: 'jpy2',
        reconciled: false,
      }),
    ).toEqual({ id: 'tx', notes: 'n', account: 'jpy2', reconciled: false });
  });

  it('limits saved transactions to their encoding and split drafts to base', () => {
    expect(
      editorHiddenAccounts({
        isAdding: false,
        accounts: all,
        account: all[0],
        hasSplits: false,
      }),
    ).toEqual(['jpy', 'jpy2', 'kwd']);
    expect(
      editorHiddenAccounts({
        isAdding: false,
        accounts: all,
        account: all[1],
        hasSplits: false,
      }),
    ).toEqual(['usd', 'kwd']);
    expect(
      editorHiddenAccounts({
        isAdding: true,
        accounts: all,
        account: all[0],
        hasSplits: true,
      }),
    ).toEqual(['jpy', 'jpy2', 'kwd']);
    expect(
      editorHiddenAccounts({
        isAdding: true,
        accounts: all,
        account: all[0],
        hasSplits: false,
      }),
    ).toEqual([]);
  });

  it('never applies a rule preview to a field edited after it started', () => {
    const { ruleFields, ruled } = rulePreviewFields({
      transaction: { ...transaction, category: undefined },
      diff: { amount: -150000, category: 'food' },
      updatedField: 'amount',
      startedAt: 1,
      fieldEditedAt: new Map([['amount', 2]]),
    });
    expect([...ruleFields]).toEqual(['category']);
    expect(ruled.amount).toBe(-1234);
  });

  it('never lets a rule preview move the draft to another encoding', () => {
    const { ruleFields } = rulePreviewFields({
      transaction,
      diff: { account: 'jpy', notes: 'ruled' },
      updatedField: 'payee',
      startedAt: 1,
      fieldEditedAt: new Map(),
      isAccountAllowed: accountId => accountId !== 'jpy',
    });
    expect([...ruleFields]).toEqual(['notes']);
  });
});
