import type { CategoryBalanceFilter } from '@actual-app/core/types/prefs';

// A category matches if it matches in any of the displayed months.
// `monthlyBalances` is undefined while the balances are still loading.
export function matchesCategoryBalanceFilter(
  filter: CategoryBalanceFilter,
  monthlyBalances: number[] | undefined,
): boolean {
  if (filter === 'all') {
    return true;
  }
  if (!monthlyBalances) {
    return false;
  }

  switch (filter) {
    case 'available':
      return monthlyBalances.some(balance => balance > 0);
    case 'no-balance':
      return monthlyBalances.some(balance => balance === 0);
    default:
      return monthlyBalances.some(balance => balance < 0);
  }
}
