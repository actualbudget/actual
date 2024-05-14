import {
  type LegendEntity,
  type IntervalEntity,
  type GroupedEntity,
} from 'loot-core/src/types/models/reports';

import { theme } from '../../../style';
import { getColorScale } from '../chart-theme';

export function calculateLegend(
  intervalData: IntervalEntity[],
  calcDataFiltered: GroupedEntity[],
  groupBy: string,
  graphType?: string,
  balanceTypeOp?: keyof GroupedEntity,
): LegendEntity[] {
  const colorScale = getColorScale('qualitative');
  const chooseData =
    groupBy === 'Interval'
      ? intervalData.map(c => {
          return { name: c.date, id: null };
        })
      : calcDataFiltered.map(c => {
          return { name: c.name, id: c.id };
        });

  const legend: LegendEntity[] = chooseData.map((item, index) => {
    return {
      id: item.id || '',
      name: item.name || '',
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
  return legend;
}
