import {
  type IntervalData,
  type ItemEntity,
} from 'loot-core/src/types/models/reports';

import { theme } from '../../../style';
import { getColorScale } from '../chart-theme';

export function calculateLegend(
  intervalData: IntervalData[],
  calcDataFiltered: ItemEntity[],
  groupBy: string,
  graphType: string,
  balanceTypeOp: string,
) {
  const colorScale = getColorScale('qualitative');
  const chooseData = groupBy === 'Interval' ? intervalData.map(c => c.date) : calcDataFiltered.map(c => c.name);
  return chooseData.map((name, index) => {
    return {
      name,
      color:
        graphType === 'DonutGraph'
          ? colorScale[index % colorScale.length]
          : groupBy === 'Interval'
            ? balanceTypeOp === 'totalDebts'
              ? theme.reportsRed
              : theme.reportsBlue
            : colorScale[index % colorScale.length],
    };
  });
}
