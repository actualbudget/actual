import { type GroupedEntity } from 'loot-core/src/types/models/reports';

export function filterEmptyRows({
  showEmpty,
  data,
  balanceTypeOp = 'totalDebts',
}: {
  showEmpty: boolean;
  data: GroupedEntity;
  balanceTypeOp?: 'totalAssets' | 'totalDebts' | 'totalTotals';
}): boolean {
  let showHide: boolean;
  if (balanceTypeOp === 'totalTotals') {
    showHide =
      data['totalDebts'] !== 0 ||
      data['totalAssets'] !== 0 ||
      data['totalTotals'] !== 0;
  } else {
    showHide = data[balanceTypeOp] !== 0;
  }
  return !showEmpty ? showHide : true;
}
