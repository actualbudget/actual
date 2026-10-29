/**
 * What Recharts passes a donut's selected sector, and how to draw its highlight.
 */
export type DonutHighlightProps = {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
  payload: { name?: string; date?: string };
  percent: number;
  value: number;
  expandInward: boolean;
  chartInnerRadius: number;
  chartMidRadius: number;
  chartOuterRadius: number;
};
