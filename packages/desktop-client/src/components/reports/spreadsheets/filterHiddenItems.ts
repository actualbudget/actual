import {
  type QueryDataEntity,
  type UncategorizedEntity,
} from '../ReportOptions';

export function filterHiddenItems(
  item: UncategorizedEntity,
  data: QueryDataEntity[],
) {
  return data.filter(asset => {
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
