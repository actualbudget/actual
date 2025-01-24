type BudgetEntity = {
  id: string;
  month: number;
  category: string;
  amount: number;
  carryover: boolean | 1 | 0;
  goal: number;
  long_goal: number;
};

export type ReflectBudgetEntity = BudgetEntity & {
  __brand: 'ReflectBudgetEntity';
};

export type ZeroBudgetEntity = BudgetEntity & {
  __brand: 'ZeroBudgetEntity';
};

export type ZeroBudgetMonthEntity = {
  id: string;
  buffered: number;
};
