import { theme } from '@actual-app/components/theme';

import {
  type LegendEntity,
  type IntervalEntity,
  type GroupedEntity,
  type balanceTypeOpType,
} from 'loot-core/types/models';

import { getColorScale } from '@desktop-client/components/reports/chart-theme';

export function calculateLegend(
  intervalData: IntervalEntity[],
  calcDataFiltered: GroupedEntity[],
  groupBy: string,
  graphType?: string,
  balanceTypeOp?: balanceTypeOpType,
): LegendEntity[] {
  const colorScale = getColorScale('qualitative');
  const chooseData =
    groupBy === 'Interval'
      ? intervalData.map(c => {
          return { name: c.date, id: null, data: c };
        })
      : calcDataFiltered.map(c => {
          return { name: c.name, id: c.id, data: c };
        });

  function getColor(data: IntervalEntity, index: number) {
    if (graphType === 'DonutGraph') {
      return colorScale[index % colorScale.length];
    }

    if (groupBy === 'Interval') {
      if (balanceTypeOp === 'totalDebts') {
        return theme.reportsRed;
      }

      if (balanceTypeOp === 'totalTotals') {
        if (data.totalTotals < 0) {
          return theme.reportsRed;
        }

        return theme.reportsBlue;
      }

      return theme.reportsBlue;
    }

    return colorScale[index % colorScale.length];
  }

  const legend: LegendEntity[] = chooseData.map((item, index) => {
    return {
      id: item.id || '',
      name: item.name || '',
      color: getColor(item.data, index),
    };
  });
  return legend;
}
