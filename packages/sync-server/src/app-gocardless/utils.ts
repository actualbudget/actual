import type { Transaction } from './gocardless-node.types';

export const printIban = (account: { iban?: string | null }): string => {
  if (account.iban) {
    return '(XXX ' + account.iban.slice(-4) + ')';
  } else {
    return '';
  }
};

const compareDates = (
  a: string | number | Date | undefined,
  b: string | number | Date | undefined,
): number => {
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return 1;
  } else if (b == null) {
    return -1;
  }

  return +new Date(a) - +new Date(b);
};

const compareFunctions: ((a: Transaction, b: Transaction) => number)[] = [
  (a, b) => compareDates(a.bookingDate, b.bookingDate),
  (a, b) => compareDates(a.bookingDateTime, b.bookingDateTime),
  (a, b) => compareDates(a.valueDate, b.valueDate),
  (a, b) => compareDates(a.valueDateTime, b.valueDateTime),
];

export const sortByBookingDateOrValueDate = <T extends Transaction>(
  transactions: T[] = [],
): T[] =>
  transactions.sort((a, b) => {
    for (const sortFunction of compareFunctions) {
      const result = sortFunction(b, a);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });

export const amountToInteger = (n: string | number): number =>
  Math.round(Number(n) * 100);
