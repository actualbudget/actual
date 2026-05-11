import { evalArithmetic } from '@actual-app/core/shared/arithmetic';
import { currentDay } from '@actual-app/core/shared/months';
import {
  amountToInteger,
  integerToCurrencyWithDecimal,
} from '@actual-app/core/shared/util';
import type { CurrencyAmount } from '@actual-app/core/shared/util';
import type { TransactionEntity } from '@actual-app/core/types/models';
import { isValid as isDateValid, parseISO } from 'date-fns';

export type SerializedTransaction = Omit<TransactionEntity, 'date'> & {
  date: string;
  debit: CurrencyAmount;
  credit: CurrencyAmount;
};

export function serializeTransaction(
  transaction: TransactionEntity,
  showZeroInDeposit?: boolean,
): SerializedTransaction {
  const { amount, date: originalDate } = transaction;

  let debit = amount < 0 ? -amount : null;
  let credit = amount > 0 ? amount : null;

  if (amount === 0) {
    if (showZeroInDeposit) {
      credit = 0;
    } else {
      debit = 0;
    }
  }

  let date = originalDate;
  // Validate the date format
  if (!isDateValid(parseISO(date))) {
    console.error(`Date '${date}' is not valid.`);
    date = null as unknown as string;
  }

  return {
    ...transaction,
    date,
    debit: debit != null ? integerToCurrencyWithDecimal(debit) : '',
    credit: credit != null ? integerToCurrencyWithDecimal(credit) : '',
  };
}

export function deserializeTransaction(
  transaction: SerializedTransaction,
  originalTransaction: TransactionEntity,
): TransactionEntity {
  const { debit, credit, date: originalDate, ...realTransaction } = transaction;

  let amount: number | null;
  if (debit !== '') {
    const parsed = evalArithmetic(debit, null);
    amount = parsed != null ? -parsed : null;
  } else {
    amount = evalArithmetic(credit, null);
  }

  amount =
    amount != null ? amountToInteger(amount) : originalTransaction.amount;
  let date = originalDate;
  if (date == null) {
    date = originalTransaction.date || currentDay();
  }

  return { ...realTransaction, date, amount };
}
