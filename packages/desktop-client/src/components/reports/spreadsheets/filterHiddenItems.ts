import {
  type QueryDataEntity,
  type UncategorizedEntity,
} from '../ReportOptions';

export function filterHiddenItems(
  item: UncategorizedEntity,
  data: QueryDataEntity[],
  showOffBudget?: boolean,
  showHiddenCategories?: boolean,
  showUncategorized?: boolean,
) {
  const showHide = data
    .filter(e =>
      !showHiddenCategories
        ? e.categoryHidden === false && e.categoryGroupHidden === false
        : true,
    )
    .filter(f =>
      showOffBudget
        ? showUncategorized
          ? //true,true
            true
          : //true,false
            f.category !== null ||
            f.accountOffBudget !== false ||
            f.transferAccount !== null
        : showUncategorized
          ? //false, true
            f.accountOffBudget === false &&
            (f.transferAccount === null || f.category !== null)
          : //false false
            f.category !== null && f.accountOffBudget === false,
    );

  return showHide.filter(query => {
    if (!item.uncategorized_id) {
      return true;
    }

    const isTransfer = item.is_transfer
      ? query.transferAccount
      : !query.transferAccount;
    const isHidden = item.has_category ? true : !query.category;
    const isOffBudget = item.is_off_budget
      ? query.accountOffBudget
      : !query.accountOffBudget;

    return isTransfer && isHidden && isOffBudget;
  });
}
