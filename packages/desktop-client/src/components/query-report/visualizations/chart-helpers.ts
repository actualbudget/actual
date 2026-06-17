import { getColorScale } from '@desktop-client/components/reports/chart-theme';

export function getSeriesColor(index: number): string {
  const colors = getColorScale('qualitative');
  return colors[index % colors.length];
}
