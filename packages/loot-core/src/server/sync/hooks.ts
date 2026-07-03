import { single } from '#shared/async';

export type BudgetChangeHook = (
  months: readonly string[],
) => Promise<void> | void;

const budgetChangeHooks = new Set<BudgetChangeHook>();

export function registerBudgetChangeHook(hook: BudgetChangeHook): () => void {
  budgetChangeHooks.add(hook);
  return () => {
    budgetChangeHooks.delete(hook);
  };
}

export const runBudgetChangeHooks = single(async function (
  months: Iterable<string>,
): Promise<void> {
  const touchedMonths = [...months];
  if (touchedMonths.length === 0) {
    return;
  }

  for (const hook of budgetChangeHooks) {
    await hook(touchedMonths);
  }
});
