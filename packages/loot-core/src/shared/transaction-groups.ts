export const transactionGroupByOptions = [
  'none',
  'date-day',
  'date-week',
  'date-month',
  'date-year',
  'category',
  'category-group',
  'payee',
  'account',
  'cleared',
] as const;

export type TransactionGroupBy = (typeof transactionGroupByOptions)[number];

export function isTransactionGroupBy(
  value: unknown,
): value is TransactionGroupBy {
  return (
    typeof value === 'string' &&
    transactionGroupByOptions.includes(value as TransactionGroupBy)
  );
}
