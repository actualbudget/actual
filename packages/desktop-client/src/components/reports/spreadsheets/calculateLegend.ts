import { theme } from '../../../style';
import { getColorScale } from '../chart-theme';
import { type ItemEntity, type MonthData } from '../entities';

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
