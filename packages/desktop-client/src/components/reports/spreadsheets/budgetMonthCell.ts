import type { Handlers } from 'loot-core/types/handlers';

export type BudgetMonthCell = Awaited<
  ReturnType<Handlers['envelope-budget-month']>
>[number];
