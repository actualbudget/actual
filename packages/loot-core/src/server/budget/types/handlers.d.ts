export interface BudgetHandlers {
  'budget/budget-amount': (arg: {
    category: string /* category id */;
    month: string;
    amount: number;
  }) => Promise<unknown>;

  'budget/copy-previous-month': (...args: unknown[]) => Promise<unknown>;

  'budget/set-zero': (...args: unknown[]) => Promise<unknown>;

  'budget/set-3month-avg': (...args: unknown[]) => Promise<unknown>;

  'budget/check-templates': (...args: unknown[]) => Promise<unknown>;

  'budget/apply-goal-template': (...args: unknown[]) => Promise<unknown>;

  'budget/overwrite-goal-template': (...args: unknown[]) => Promise<unknown>;

  'budget/cleanup-goal-template': (...args: unknown[]) => Promise<unknown>;

  'budget/hold-for-next-month': (...args: unknown[]) => Promise<unknown>;

  'budget/reset-hold': (...args: unknown[]) => Promise<unknown>;

  'budget/cover-overspending': (...args: unknown[]) => Promise<unknown>;

  'budget/transfer-available': (...args: unknown[]) => Promise<unknown>;

  'budget/transfer-category': (...args: unknown[]) => Promise<unknown>;

  'budget/set-carryover': (...args: unknown[]) => Promise<unknown>;
}
