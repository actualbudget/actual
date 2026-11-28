import { getEffectiveCurrency } from '@actual-app/core/shared/fx/currency';
import type {
  AccountEntity,
  CategoryEntity,
} from '@actual-app/core/types/models';

import type { CategoryLine } from '#hooks/useCategoryCurrencies';

// The accounts whose transactions count in `line` of a category in `month`
// ('YYYY-MM'), as the budget splits spending: a currency line gets its
// currency's accounts, and the category's own line every account in a
// currency without a line started by then
export function getCurrencyLineAccountIds({
  categoryId,
  line,
  lines,
  month,
  accounts,
  defaultCurrencyCode,
}: {
  categoryId: CategoryEntity['id'];
  line: CategoryLine;
  lines: CategoryLine[];
  month: string;
  accounts: AccountEntity[];
  defaultCurrencyCode: string;
}): AccountEntity['id'][] {
  const currencyOf = (account: AccountEntity) =>
    getEffectiveCurrency(account.currency, defaultCurrencyCode);

  if (line.id !== categoryId) {
    return accounts
      .filter(account => currencyOf(account) === line.currencyCode)
      .map(account => account.id);
  }

  const startedCurrencies = new Set(
    lines
      .filter(
        other =>
          other.id !== categoryId &&
          (other.startMonth == null || other.startMonth <= month),
      )
      .map(other => other.currencyCode),
  );
  return accounts
    .filter(account => !startedCurrencies.has(currencyOf(account)))
    .map(account => account.id);
}
