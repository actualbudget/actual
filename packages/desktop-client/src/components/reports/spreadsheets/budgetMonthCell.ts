import type { CategoryPocketsMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { Handlers } from '@actual-app/core/types/handlers';

export type BudgetMonthCell = Awaited<
  | ReturnType<Handlers['envelope-budget-month']>
  | ReturnType<Handlers['tracking-budget-month']>
>[number];

/** A category's currency pocket month, when it has pockets (MC-10). */
export function categoryPockets(
  cells: BudgetMonthCell[],
  categoryId: string,
): CategoryPocketsMonth | undefined {
  const value = cells.find(cell =>
    cell.name.endsWith(`category-pockets-${categoryId}`),
  )?.value;
  return typeof value === 'object' && value !== null ? value : undefined;
}

/** A sum where an unknown term makes the total unknown. */
export function addKnown(a: number | null, b: number | null) {
  return a === null || b === null ? null : a + b;
}
