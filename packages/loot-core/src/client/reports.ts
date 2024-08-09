import {
  type AccountEntity,
  type CategoryEntity,
  type CustomReportEntity,
  type PayeeEntity,
} from '../types/models';

/**
 * Checks if the given custom report has issues with conditions
 * (i.e. non-existing category/payee/account being used).
 */
export function calculateHasWarning(
  report: CustomReportEntity,
  {
    categories,
    accounts,
    payees,
  }: {
    categories: CategoryEntity[];
    accounts: AccountEntity[];
    payees: PayeeEntity[];
  },
) {
  const categoryIds = new Set(categories.map(({ id }) => id));
  const payeeIds = new Set(payees.map(({ id }) => id));
  const accountIds = new Set(accounts.map(({ id }) => id));

  if (!report.conditions) {
    return false;
  }

  for (const cond of report.conditions) {
    const { field, value, op } = cond;
    const isMultiCondition = Array.isArray(value);
    const isSupportedSingleCondition = ['is', 'isNot'].includes(op);

    // Regex and other more complicated operations are not supported
    if (!isSupportedSingleCondition && !isMultiCondition) {
      continue;
    }

    switch (field) {
      case 'account':
        if (isMultiCondition) {
          if (value.find(val => !accountIds.has(val))) {
            return true;
          }
          break;
        }

        if (!accountIds.has(value)) {
          return true;
        }
        break;
      case 'payee':
        if (isMultiCondition) {
          if (value.find(val => !payeeIds.has(val))) {
            return true;
          }
          break;
        }

        if (!payeeIds.has(value)) {
          return true;
        }
        break;
      case 'category':
        if (isMultiCondition) {
          if (value.find(val => !categoryIds.has(val))) {
            return true;
          }
          break;
        }

        if (!categoryIds.has(value)) {
          return true;
        }
        break;
    }
  }
  return false;
}
