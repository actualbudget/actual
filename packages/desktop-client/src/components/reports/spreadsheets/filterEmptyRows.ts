import { type DataEntity } from 'loot-core/src/types/models/reports';

export function filterEmptyRows(
  showEmpty: boolean,
  data: DataEntity,
  balanceTypeOp: keyof DataEntity,
): boolean {
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
