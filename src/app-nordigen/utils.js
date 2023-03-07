export const printIban = (account) => {
  if (account.iban) {
    return '(XXX ' + account.iban.slice(-4) + ')';
  } else {
    return '';
  }
};

export const sortByBookingDate = (transactions = []) =>
  transactions.sort(
    (a, b) => +new Date(b.bookingDate) - +new Date(a.bookingDate),
  );

export const amountToInteger = (n) => Math.round(n * 100);
