import {
  type QueryDataEntity,
  type UncategorizedEntity,
} from '@desktop-client/components/reports/ReportOptions';

export function filterHiddenItems(
  item: UncategorizedEntity,
  data: QueryDataEntity[],
  showOffBudget?: boolean,
  showHiddenCategories?: boolean,
  showUncategorized?: boolean,
  groupByCategory?: boolean,
) {
  const showHide = data
    .filter(
      e =>
        showHiddenCategories ||
        (e.categoryHidden === false && e.categoryGroupHidden === false),
    )
    .filter(e => showOffBudget || e.accountOffBudget === false)
    .filter(
      e =>
        showUncategorized || e.category !== null || e.accountOffBudget === true,
    );

  return showHide.filter(query => {
    if (!groupByCategory) return true;

    const hasCategory = !!query.category;
    const isOffBudget = query.accountOffBudget;
    const isTransfer = !!query.transferAccount;

    if (hasCategory && !isOffBudget) {
      return item.uncategorized_id == null;
    }

    switch (item.uncategorized_id) {
      case 'off_budget':
        return isOffBudget;
      case 'transfer':
        return isTransfer && !isOffBudget;
      case 'other':
        return !isOffBudget && !isTransfer;
      case 'all':
        return true;
      default:
        return false;
    }
  });
}
