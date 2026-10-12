import type {
  balanceTypeOpType,
  GroupedEntity,
  sortByOpType,
} from '@actual-app/core/types/models';

const reverseSort: Partial<Record<sortByOpType, sortByOpType>> = {
  asc: 'desc',
  desc: 'asc',
};

const balanceTypesToReverse = ['totalDebts', 'netDebts'];

const shouldReverse = (balanceTypeOp: balanceTypeOpType) =>
  balanceTypesToReverse.includes(balanceTypeOp);

export function sortData({
  balanceTypeOp,
  sortByOp,
  isSigned = false,
}: {
  balanceTypeOp?: balanceTypeOpType;
  sortByOp?: sortByOpType;
  // Signed values, like changes from a baseline, are shown as they are, so
  // spending isn't flipped to sort largest first
  isSigned?: boolean;
}): (a: GroupedEntity, b: GroupedEntity) => number {
  if (!balanceTypeOp || !sortByOp) return () => 0;

  if (!isSigned && shouldReverse(balanceTypeOp)) {
    sortByOp = reverseSort[sortByOp] ?? sortByOp;
  }

  // Return a comparator function
  return (a, b) => {
    let comparison = 0;
    if (sortByOp === 'asc') {
      comparison = a[balanceTypeOp] - b[balanceTypeOp];
    } else if (sortByOp === 'desc') {
      comparison = b[balanceTypeOp] - a[balanceTypeOp];
    } else if (sortByOp === 'name') {
      comparison = (a.name ?? '').localeCompare(b.name ?? '');
    } else if (sortByOp === 'budget') {
      comparison = 0;
    }

    return comparison;
  };
}
