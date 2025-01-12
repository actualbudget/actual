import {
  type balanceTypeOpType,
  type sortByOpType,
  type GroupedEntity,
} from 'loot-core/src/types/models/reports';

export function sortData({
  balanceTypeOp,
  sortByOp,
}: {
  balanceTypeOp?: balanceTypeOpType;
  sortByOp?: sortByOpType;
}): (a: GroupedEntity, b: GroupedEntity) => number {
  // Return a comparator function
  return (a, b) => {
    if (!balanceTypeOp) return 0;

    let comparison = 0;
    if (sortByOp === 'asc') {
      comparison = a[balanceTypeOp] - b[balanceTypeOp];
    } else if (sortByOp === 'desc') {
      comparison = b[balanceTypeOp] - a[balanceTypeOp];
    }

    return comparison;
  };
}
