import {
  type QueryDataEntity,
  type UncategorizedEntity,
} from '../ReportOptions';

export function filterHiddenItems(
  item: UncategorizedEntity,
  data: QueryDataEntity[],
  showOffBudget?: boolean,
  showUncategorized?: boolean,
  showHiddenCategories?: boolean,
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
            f.accountOffBudget === false && f.transferAccount === null
          : //false false
            f.category !== null &&
            f.accountOffBudget === false &&
            f.transferAccount === null,
    );

  return showHide.filter(asset => {
    if (!item.uncategorized_id) {
      return true;
    }

    const isTransfer = item.is_transfer
      ? asset.transferAccount
      : !asset.transferAccount;
    const isHidden = item.has_category ? true : !asset.category;
    const isOffBudget = item.is_off_budget
      ? asset.accountOffBudget
      : !asset.accountOffBudget;

    return isTransfer && isHidden && isOffBudget;
  });
}
