import { type GroupedEntity } from '../entities';

export function filterEmptyRows(
  showEmpty: boolean,
  data: GroupedEntity,
  balanceTypeOp: string,
): boolean {
  let showHide;
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
