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

export function sumDecimalAmounts(amounts: string[]): string {
  const parsed = amounts.map(amount => {
    if (
      typeof amount !== 'string' ||
      amount.length > 32 ||
      !/^-?\d+(?:\.\d+)?$/.test(amount)
    ) {
      throw new Error('Invalid GoCardless amount');
    }
    const [whole, fraction = ''] = amount.replace('-', '').split('.');
    if (fraction.length > 15) {
      throw new Error('Invalid GoCardless amount');
    }
    return {
      value: BigInt(whole + fraction) * (amount.startsWith('-') ? -1n : 1n),
      precision: fraction.length,
    };
  });
  const precision = parsed.reduce(
    (maximum, amount) => Math.max(maximum, amount.precision),
    0,
  );
  const total = parsed.reduce(
    (sum, amount) =>
      sum + amount.value * 10n ** BigInt(precision - amount.precision),
    0n,
  );
  const digits = (total < 0n ? -total : total)
    .toString()
    .padStart(precision + 1, '0');
  const result = `${total < 0n ? '-' : ''}${
    precision
      ? `${digits.slice(0, -precision)}.${digits.slice(-precision)}`
      : digits
  }`;
  if (result.length > 32) {
    throw new Error('GoCardless amount exceeds wire limit');
  }
  return result;
}

export function startingBalanceFromTransactions(
  balance: string,
  transactions: Transaction[],
): string {
  return subtractDecimalAmounts(
    balance,
    transactions.map(transaction => transaction.transactionAmount.amount),
  );
}

export function subtractDecimalAmounts(
  balance: string,
  amounts: string[],
): string {
  return sumDecimalAmounts([
    balance,
    ...amounts.map(amount => {
      if (typeof amount !== 'string') {
        throw new Error('Invalid GoCardless amount');
      }
      return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
    }),
  ]);
}
