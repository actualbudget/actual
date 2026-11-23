import { categoryLists } from '#components/reports/ReportOptions';
import type { UncategorizedEntity } from '#components/reports/ReportOptions';

import { filterCategoriesByConditions } from './budgetDataQuery';
import type { createCustomSpreadsheetProps } from './custom-spreadsheet';

// Row eligibility is independent of activity: selected categories can be empty,
// while excluded categories must never be restored by "Show empty rows".
export function reportCategoryLists({
  categories,
  conditions,
  conditionsOp,
  showOffBudget,
  showHiddenCategories,
  showUncategorized,
}: Pick<
  createCustomSpreadsheetProps,
  | 'categories'
  | 'conditions'
  | 'conditionsOp'
  | 'showOffBudget'
  | 'showHiddenCategories'
  | 'showUncategorized'
>) {
  const plainConditions = conditions.filter(condition => !condition.customName);
  // With OR, another field can match transactions in any category. Category
  // conditions alone cannot rule out a row in that case.
  const rowConditions =
    conditionsOp === 'or' &&
    plainConditions.some(
      condition =>
        condition.field !== 'category' && condition.field !== 'category_group',
    )
      ? []
      : plainConditions;
  const op = conditionsOp === 'or' ? 'or' : 'and';
  const hiddenGroupIds = new Set(
    categories.grouped.filter(group => group.hidden).map(group => group.id),
  );
  const visibleCategories = categories.list.filter(
    category =>
      showHiddenCategories ||
      (!category.hidden && !hiddenGroupIds.has(category.group)),
  );
  const eligibleCategories = filterCategoriesByConditions(
    visibleCategories,
    categories.grouped,
    rowConditions,
    op,
  );
  const eligibleIds = new Set(eligibleCategories.map(category => category.id));
  const allowsUncategorized =
    filterCategoriesByConditions(
      [{ id: null, name: '', group: null }],
      categories.grouped,
      rowConditions,
      op,
    ).length > 0;
  // `category is null` is expanded by conditionsToAQL to exclude transfers.
  const allowsTransfers =
    filterCategoriesByConditions(
      [{ id: null, name: '', group: null }],
      categories.grouped,
      rowConditions.map(condition =>
        condition.field === 'category' &&
        condition.op === 'is' &&
        condition.value === null
          ? { field: 'category', op: 'oneOf', value: [] }
          : condition,
      ),
      op,
    ).length > 0;
  const isEligible = (item: UncategorizedEntity) => {
    switch (item.uncategorized_id) {
      case 'other':
        return showUncategorized && allowsUncategorized;
      case 'transfer':
        return showUncategorized && allowsTransfers;
      case 'off_budget':
        // Off-budget transactions may have a selected category, or no category.
        return showOffBudget && (eligibleIds.size > 0 || allowsUncategorized);
      default:
        return eligibleIds.has(item.id);
    }
  };
  const [categoryList, categoryGroups] = categoryLists(categories);
  const eligibleGroups = categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories?.filter(isEligible),
    }))
    .filter(group => (group.categories?.length ?? 0) > 0);

  return [categoryList.filter(isEligible), eligibleGroups] as const;
}
