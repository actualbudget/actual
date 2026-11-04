// A transaction's amount converted into the budget's default currency, for
// reports that add up transactions of accounts in different currencies. It
// follows the user's rate setting (latest rate or the rate of the
// transaction's date) and is the plain amount for accounts without a
// currency of their own, so it can replace '$amount' in any sum.
export const CONVERTED_AMOUNT = {
  $fx: ['$amount', '$account.currency', '$date'],
};
