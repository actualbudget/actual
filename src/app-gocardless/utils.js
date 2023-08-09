export const printIban = (account) => {
  if (account.iban) {
    return '(XXX ' + account.iban.slice(-4) + ')';
  } else {
    return '';
  }
};

export const sortByBookingDateOrValueDate = (transactions = []) =>
  transactions.sort(
    (a, b) =>
      +new Date(b.bookingDate || b.valueDate) -
      +new Date(a.bookingDate || a.valueDate),
  );

export const amountToInteger = (n) => Math.round(n * 100);
