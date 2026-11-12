// What a category budgeted, spent or has left in a month, from the cells the
// budget month endpoints return. A category budgeted in several currencies
// has a total of all of them, in the default currency, which then counts
// instead of its own budget.
type CategoryMonthKind = 'budget' | 'sum-amount' | 'leftover';

export function findCategoryMonthCell<T extends { name: string }>(
  monthData: readonly T[],
  kind: CategoryMonthKind,
  categoryId: string,
): T | undefined {
  // Cell names are `<sheet>!<cell>`
  const total = `!${kind}-total-${categoryId}`;
  const own = `!${kind}-${categoryId}`;
  return (
    monthData.find(cell => cell.name.endsWith(total)) ??
    monthData.find(cell => cell.name.endsWith(own))
  );
}
