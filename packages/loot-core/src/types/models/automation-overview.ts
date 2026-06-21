import type { CategoryEntity } from './category';
import type { CategoryGroupEntity } from './category-group';

export type AutomationOverviewAmounts = {
  carriedOver: number;
  needed: number;
  budgeted: number;
  remaining: number;
  overfunded: number;
  averageCarriedOver?: number;
  averageNeeded?: number;
  averageBudgeted?: number;
  averageRemaining?: number;
  averageOverfunded?: number;
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
