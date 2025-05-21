import { parseISO, isValid as isDateValid } from 'date-fns';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { currentDay } from 'loot-core/shared/months';
import {
  amountToInteger,
  type CurrencyAmount,
  integerToCurrency,
} from 'loot-core/shared/util';
import {
  type AccountEntity,
  type CategoryEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

export type SerializedTransaction = Omit<TransactionEntity, 'date'> & {
  date: string;
  debit: CurrencyAmount;
  credit: CurrencyAmount;
};

export type TransactionEditFunction = (
  id: TransactionEntity['id'],
  name: string,
) => void;

export type TransactionUpdateFunction = <T extends keyof SerializedTransaction>(
  name: T,
  value: SerializedTransaction[T],
) => void;

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
    // Be a little forgiving if the date isn't valid. This at least
    // stops the UI from crashing, but this is a serious problem with
    // the data. This allows the user to go through and see empty
    // dates and manually fix them.
    console.error(`Date ‘${date}’ is not valid.`);
    // TODO: the fact that the date type is not nullable but we are setting it to null needs to be changed
    date = null as unknown as string;
  }

  return {
    ...transaction,
    date,
    debit: debit != null ? integerToCurrency(debit) : '',
    credit: credit != null ? integerToCurrency(credit) : '',
  };
}

export function deserializeTransaction(
  transaction: SerializedTransaction,
  originalTransaction: TransactionEntity,
) {
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

export function isLastChild(
  transactions: readonly TransactionEntity[],
  index: number,
) {
  const trans = transactions[index];
  return (
    trans &&
    trans.is_child &&
    (transactions[index + 1] == null ||
      transactions[index + 1].parent_id !== trans.parent_id)
  );
}

export function selectAscDesc(
  field: string,
  ascDesc: 'asc' | 'desc',
  clicked: string,
  defaultAscDesc: 'asc' | 'desc' = 'asc',
) {
  return field === clicked
    ? ascDesc === 'asc'
      ? 'desc'
      : 'asc'
    : defaultAscDesc;
}

export function getDisplayValue<T>(obj: T | null | undefined, name: keyof T) {
  return obj ? obj[name] : '';
}

export function makeTemporaryTransactions(
  currentAccountId: AccountEntity['id'] | null | undefined,
  currentCategoryId: CategoryEntity['id'] | null | undefined,
  lastDate?: string | null,
): TransactionEntity[] {
  return [
    {
      id: 'temp',
      date: lastDate || currentDay(),
      // TODO: consider making this default to an empty string
      account: (currentAccountId || null) as string,
      category: currentCategoryId || undefined,
      cleared: false,
      // TODO: either make this nullable or find a way to make this not null
      amount: null as unknown as number,
    },
  ];
}
