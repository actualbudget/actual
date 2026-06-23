type SortDirection = 'asc' | 'desc' | undefined;

export type TransactionSortExpression = Record<string, SortDirection>;

export function getTransactionSortField(field?: string) {
  if (!field) {
    return 'date';
  }

  switch (field) {
    case 'account':
      return 'account.name';
    case 'payee':
      return 'payee.name';
    case 'category':
      return 'category.name';
    case 'payment':
    case 'deposit':
      return 'amount';
    default:
      return field;
  }
}

export function getTransactionSortExpressions(
  field?: string,
  direction?: SortDirection,
): TransactionSortExpression[] {
  const sortField = getTransactionSortField(field);

  switch (sortField) {
    case 'cleared':
      return [{ reconciled: direction }, { cleared: direction }];
    case 'payee.name':
      return [
        { 'payee.name': direction },
        { 'payee.transfer_acct.name': direction },
      ];
    default:
      return [{ [sortField]: direction }];
  }
}
