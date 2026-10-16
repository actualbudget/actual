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
  chartOuterRadius: number;
  // Shown instead of the plain amount, like "Baseline: 12.00"
  valueText?: string;
  // Shown in brackets after the amount, like a change from a baseline
  change?: { text: string; color: string };
  // How solid the highlight is, so a faint ring gets a faint highlight
  highlightOpacity?: number;
};
