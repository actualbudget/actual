import type { CategoryEntity } from './category';

export type AutomationOverviewCategory = {
  categoryId: CategoryEntity['id'];
  categoryName: string;
  needed: number;
  budgeted: number;
  remaining: number;
};

export type AutomationOverview = {
  month: string;
  totalNeeded: number;
  totalBudgeted: number;
  remaining: number;
  categories: AutomationOverviewCategory[];
};
