/**
 * What Recharts passes a donut's active sector, and how to draw around it.
 */
export type DonutActiveShapeProps = {
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
