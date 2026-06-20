import type {
  AutomationOverview,
  AutomationOverviewAmounts,
  AutomationOverviewCategoryRow,
  AutomationOverviewGroup,
  CategoryEntity,
} from '@actual-app/core/types/models';

function sumCategoryRows(
  rows: AutomationOverviewCategoryRow[],
  monthCount: number,
): AutomationOverviewAmounts {
  const totals = rows.reduce(
    (acc, row) => ({
      carriedOver: acc.carriedOver + row.carriedOver,
      needed: acc.needed + row.needed,
      budgeted: acc.budgeted + row.budgeted,
      remaining: acc.remaining + row.remaining,
    }),
    { carriedOver: 0, needed: 0, budgeted: 0, remaining: 0 },
  );

  if (monthCount <= 1) {
    return totals;
  }

  return {
    ...totals,
    averageNeeded: Math.round(totals.needed / monthCount),
  };
}

export function filterAutomationOverview(
  data: AutomationOverview,
  selectedCategories: CategoryEntity[],
): AutomationOverview {
  const selectedIds = new Set(selectedCategories.map(category => category.id));

  const groups: AutomationOverviewGroup[] = data.groups
    .map(group => {
      const categories = group.categories.filter(category =>
        selectedIds.has(category.categoryId),
      );

      if (categories.length === 0) {
        return null;
      }

      return {
        ...group,
        categories,
        subtotal: sumCategoryRows(categories, data.monthCount),
      };
    })
    .filter((group): group is AutomationOverviewGroup => group != null);

  const allCategories = groups.flatMap(group => group.categories);

  return {
    ...data,
    groups,
    totals: sumCategoryRows(allCategories, data.monthCount),
  };
}
