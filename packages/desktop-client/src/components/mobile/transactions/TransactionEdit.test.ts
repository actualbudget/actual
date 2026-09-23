import type { TransactionEntity } from '@actual-app/core/types/models';

import {
  deserializeTransaction,
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
