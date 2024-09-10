import { type CustomReportEntity } from './reports';
import { type RuleConditionEntity } from './rule';

export type TimeFrame = {
  start: string;
  end: string;
  mode: 'sliding-window' | 'static' | 'full';
};

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

export type NetWorthWidget = AbstractWidget<
  'net-worth-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
  } | null
>;
export type CashFlowWidget = AbstractWidget<
  'cash-flow-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
  } | null
>;
export type SpendingWidget = AbstractWidget<
  'spending-card',
  { name?: string } | null
>;
export type CustomReportWidget = AbstractWidget<
  'custom-report',
  { id: string }
>;
export type MarkdownWidget = AbstractWidget<
  'markdown-card',
  { content: string; text_align?: 'left' | 'right' | 'center' }
>;

type SpecializedWidget =
  | NetWorthWidget
  | CashFlowWidget
  | SpendingWidget
  | MarkdownWidget;
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
