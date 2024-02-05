// @ts-strict-ignore
import {
  type ItemEntity,
  type MonthData,
} from 'loot-core/src/types/models/reports';

import { theme } from '../../../style';
import { getColorScale } from '../chart-theme';

export function calculateLegend(
  monthData: MonthData[],
  calcDataFiltered: ItemEntity[],
  groupBy: string,
  graphType: string,
  balanceTypeOp: string,
) {
  const colorScale = getColorScale('qualitative');
  const chooseData = ['Month', 'Year'].includes(groupBy)
    ? monthData
    : calcDataFiltered;
  return chooseData.map((c, index) => {
    return {
      name: ['Month', 'Year'].includes(groupBy) ? c.date : c.name,
      color:
        graphType === 'DonutGraph'
          ? colorScale[index % colorScale.length]
          : ['Month', 'Year'].includes(groupBy)
            ? balanceTypeOp === 'totalDebts'
              ? theme.reportsRed
              : theme.reportsBlue
            : colorScale[index % colorScale.length],
    };
  });
}
