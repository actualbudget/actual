type AbstractWidget<
  T extends string,
  Meta extends Record<string, unknown> = null,
> = {
  id: string;
  type: T;
  x: number;
  y: number;
  width: number;
  height: number;
  meta: Meta;
};

type NetWorthWidget = AbstractWidget<'net-worth-card'>;
type CashFlowWidget = AbstractWidget<'cash-flow-card'>;
type SpendingWidget = AbstractWidget<'spending-card'>;
export type CustomReportWidget = AbstractWidget<
  'custom-report',
  { id: string }
>;

export type Widget =
  | NetWorthWidget
  | CashFlowWidget
  | SpendingWidget
  | CustomReportWidget;
