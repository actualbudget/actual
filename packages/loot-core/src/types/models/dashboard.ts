import { type CustomReportEntity } from './reports';
import { type RuleConditionEntity } from './rule';

export type TimeFrame = {
  start: string;
  end: string;
  mode:
    | 'sliding-window'
    | 'static'
    | 'full'
    | 'lastMonth'
    | 'lastYear'
    | 'yearToDate'
    | 'priorYearToDate';
};

type AbstractWidget<
  T extends string,
  Meta extends Record<string, unknown> | null = null,
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
    interval?: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  } | null
>;
export type CashFlowWidget = AbstractWidget<
  'cash-flow-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    showBalance?: boolean;
  } | null
>;
export type SpendingWidget = AbstractWidget<
  'spending-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    compare?: string;
    compareTo?: string;
    isLive?: boolean;
    mode?: 'single-month' | 'budget' | 'average';
  } | null
>;
export type CustomReportWidget = AbstractWidget<
  'custom-report',
  { id: string }
>;
export type CrossoverWidget = AbstractWidget<
  'crossover-card',
  {
    name?: string;
    expenseCategoryIds?: string[];
    incomeAccountIds?: string[];
    timeFrame?: TimeFrame;
    safeWithdrawalRate?: number; // 0.04 default
    estimatedReturn?: number | null; // annual
    projectionType?: 'trend' | 'hampel'; // expense projection method
    showHiddenCategories?: boolean; // show hidden categories in selector
  } | null
>;
export type MarkdownWidget = AbstractWidget<
  'markdown-card',
  { content: string; text_align?: 'left' | 'right' | 'center' }
>;

type SpecializedWidget =
  | NetWorthWidget
  | CashFlowWidget
  | SpendingWidget
  | CrossoverWidget
  | MarkdownWidget
  | SummaryWidget
  | CalendarWidget
  | FormulaWidget;
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

export type SummaryWidget = AbstractWidget<
  'summary-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
    content?: string;
  } | null
>;

export type BaseSummaryContent = {
  type: 'sum' | 'avgPerMonth' | 'avgPerYear' | 'avgPerTransact';
  fontSize?: number;
};

export type PercentageSummaryContent = {
  type: 'percentage';
  divisorConditions: RuleConditionEntity[];
  divisorConditionsOp: 'and' | 'or';
  divisorAllTimeDateRange?: boolean;
  fontSize?: number;
};

export type SummaryContent = BaseSummaryContent | PercentageSummaryContent;

export type CalendarWidget = AbstractWidget<
  'calendar-card',
  {
    name?: string;
    conditions?: RuleConditionEntity[];
    conditionsOp?: 'and' | 'or';
    timeFrame?: TimeFrame;
  } | null
>;

export type FormulaWidget = AbstractWidget<
  'formula-card',
  {
    name?: string;
    formula?: string;
    fontSize?: number;
    fontSizeMode?: 'dynamic' | 'static';
    staticFontSize?: number;
    colorFormula?: string;
    queriesVersion?: number;
    queries?: Record<
      string,
      {
        conditions?: RuleConditionEntity[];
        conditionsOp?: 'and' | 'or';
        timeFrame?: TimeFrame;
      }
    >;
  } | null
>;
