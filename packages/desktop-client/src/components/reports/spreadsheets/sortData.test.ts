import type { GroupedEntity } from '@actual-app/core/types/models';

import { sortData } from './sortData';

function row(name: string, totalDebts: number): GroupedEntity {
  return {
    id: name,
    name,
    intervalData: [],
    totalAssets: 0,
    totalDebts,
    totalTotals: totalDebts,
    netAssets: 0,
    netDebts: totalDebts,
    totalBudgeted: 0,
  };
}

describe('sortData', () => {
  const rows = [row('small', -100), row('large', -500), row('refund', 200)];

  it('puts the largest spending first when descending', () => {
    expect(
      [...rows]
        .sort(sortData({ balanceTypeOp: 'totalDebts', sortByOp: 'desc' }))
        .map(r => r.name),
    ).toEqual(['large', 'small', 'refund']);
  });

  it('sorts signed values as they are', () => {
    expect(
      [...rows]
        .sort(
          sortData({
            balanceTypeOp: 'totalDebts',
            sortByOp: 'desc',
            isSigned: true,
          }),
        )
        .map(r => r.name),
    ).toEqual(['refund', 'small', 'large']);
  });
});
