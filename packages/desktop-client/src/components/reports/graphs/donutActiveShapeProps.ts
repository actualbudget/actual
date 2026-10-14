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
  // An extra line under the amount, like a change from a baseline
  detail?: { text: string; color: string };
  // A word after the amount saying what it is, like "baseline"
  valueSuffix?: string;
};
