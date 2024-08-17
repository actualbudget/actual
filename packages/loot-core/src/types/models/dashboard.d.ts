import { type CustomReportEntity } from './reports';

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
  tombstone: boolean;
};

type NetWorthWidget = AbstractWidget<'net-worth-card'>;
type CashFlowWidget = AbstractWidget<'cash-flow-card'>;
type SpendingWidget = AbstractWidget<'spending-card'>;
export type CustomReportWidget = AbstractWidget<
  'custom-report',
  { id: string }
>;

type SpecializedWidget = NetWorthWidget | CashFlowWidget | SpendingWidget;
export type Widget = SpecializedWidget | CustomReportWidget;
export type NewWidget = Omit<Widget, 'id' | 'tombstone'>;

// Exported/imported (json) widget definition
export type ExportImportCustomReportWidget = Omit<
  CustomReportWidget,
  'id' | 'meta' | 'tombstone'
> & {
  meta: Omit<CustomReportEntity, 'tombstone'>;
};
export type ExportImportDashboardWidget = Omit<
  ExportImportCustomReportWidget | SpecializedWidget,
  'tombstone'
>;

export type ExportImportDashboard = {
  // Dashboard exports can be versioned; currently we support
  // only a single version, but lets account for multiple
  // future versions
  version: 1;
  widgets: ExportImportDashboardWidget[];
};
