export type BudgetChangeHook = (
  months: readonly string[],
) => Promise<void> | void;

function getBudgetChangeHooks(): Set<BudgetChangeHook> {
  const store = getBudgetChangeHooks as typeof getBudgetChangeHooks & {
    hooks?: Set<BudgetChangeHook>;
  };
  store.hooks ||= new Set();
  return store.hooks;
}

export function registerBudgetChangeHook(hook: BudgetChangeHook): () => void {
  getBudgetChangeHooks().add(hook);
  return () => {
    getBudgetChangeHooks().delete(hook);
  };
}

export async function runBudgetChangeHooks(
  months: Iterable<string>,
): Promise<void> {
  const touchedMonths = [...months];
  if (touchedMonths.length === 0) {
    return;
  }

  for (const hook of getBudgetChangeHooks()) {
    await hook(touchedMonths);
  }
}
