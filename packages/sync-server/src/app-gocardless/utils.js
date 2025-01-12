export const printIban = (account) => {
  if (account.iban) {
    return '(XXX ' + account.iban.slice(-4) + ')';
  } else {
    return '';
  }
};

const compareDates = (
  /** @type {string | number | Date | undefined} */ a,
  /** @type {string | number | Date | undefined} */ b,
) => {
  if (a == null && b == null) {
    return 0;
  } else if (a == null) {
    return 1;
  } else if (b == null) {
    return -1;
  }

  return +new Date(a) - +new Date(b);
};

/**
 * @type {(function(*, *): number)[]}
 */
const compareFunctions = [
  (a, b) => compareDates(a.bookingDate, b.bookingDate),
  (a, b) => compareDates(a.bookingDateTime, b.bookingDateTime),
  (a, b) => compareDates(a.valueDate, b.valueDate),
  (a, b) => compareDates(a.valueDateTime, b.valueDateTime),
];

export const sortByBookingDateOrValueDate = (transactions = []) =>
  transactions.sort((a, b) => {
    for (const sortFunction of compareFunctions) {
      const result = sortFunction(b, a);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  });

export const amountToInteger = (n) => Math.round(n * 100);
