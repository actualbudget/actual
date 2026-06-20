import type { CategoryEntity, CategoryGroupEntity } from './category';

export type AutomationOverviewAmounts = {
  carriedOver: number;
  needed: number;
  budgeted: number;
  remaining: number;
  averageCarriedOver?: number;
  averageNeeded?: number;
  averageBudgeted?: number;
  averageRemaining?: number;
};

export type AutomationOverviewCategoryRow = {
  categoryId: CategoryEntity['id'];
  categoryName: string;
} & AutomationOverviewAmounts;

export type AutomationOverviewGroup = {
  groupId: CategoryGroupEntity['id'];
  groupName: string;
  categories: AutomationOverviewCategoryRow[];
  subtotal: AutomationOverviewAmounts;
};

export type AutomationOverview = {
  startMonth: string;
  endMonth: string;
  monthCount: number;
  totals: AutomationOverviewAmounts;
  groups: AutomationOverviewGroup[];
};
