import { expect } from './fixtures';
import type { BudgetPage } from './page-models/budget-page';
import { parseAmountToCents } from './qe-money';

/**
 * Set a category's budgeted amount and wait for the budget sheet to finish
 * recalculating before returning.
 *
 * `BudgetPage.setBudgetedAmount` resolves as soon as the input is committed,
 * but the sheet recomputes asynchronously. Reading a balance straight after it
 * can therefore capture a pre-recalculation value, and any later assertion
 * built on that stale baseline will never reconcile.
 *
 * This surfaced as a real intermittent failure in two separate tests (B4 and
 * B9), each of which passed on retry — the classic shape of a race that is
 * tempting to dismiss as environmental. Polling the budgeted cell until it
 * shows the value we just wrote gives the sheet a deterministic point to have
 * settled by.
 *
 * @param rowIndex the category's row index, needed because the getters address
 *   rows positionally while the setter addresses them by name.
 */
export async function setBudgetedAmountAndSettle(
  budgetPage: BudgetPage,
  categoryName: string,
  rowIndex: number,
  amount: string,
) {
  await budgetPage.setBudgetedAmount(categoryName, amount);

  await expect
    .poll(() => budgetPage.getBudgetedForRow(rowIndex))
    .toEqual(parseAmountToCents(amount));
}
