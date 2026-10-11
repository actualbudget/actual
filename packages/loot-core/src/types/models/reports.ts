import type { RuleConditionEntity } from './rule';

export type CustomReportTagScope =
  | { mode: 'all' }
  | { mode: 'selected'; tagIds: string[] };

export type CustomReportMetadata = Record<string, unknown>;

type CustomReportStoredMetadata = CustomReportMetadata & {
  tagScope?: CustomReportTagScope;
};

export type CustomReportEntity = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isDateStatic: boolean;
  dateRange: string;
  mode: string;
  groupBy: string;
  tagScope?: CustomReportTagScope;
  interval: string;
  balanceType: string;
  sortBy?: sortByOpType;
  showEmpty: boolean;
  showOffBudget: boolean;
  showHiddenCategories: boolean;
  includeCurrentInterval: boolean;
  showUncategorized: boolean;
  trimIntervals: boolean;
  showTrendLines: boolean;
  graphType: string;
  conditions?: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  metadata?: CustomReportMetadata;
  tombstone?: boolean;
};

export type balanceTypeOpType =
  | 'totalAssets'
  | 'totalDebts'
  | 'totalTotals'
  | 'netAssets'
  | 'netDebts'
  | 'totalBudgeted';

export type sortByOpType = 'asc' | 'desc' | 'name' | 'budget';

export type SpendingMonthEntity = Record<
  string | number,
  {
    cumulative: number;
    daily: number;
    date: string;
    month: string;
  }
>;

export type SpendingDataEntity = {
  date: string;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
  cumulative: number;
};

export type SpendingEntity = {
  intervalData: {
    months: SpendingMonthEntity;
    day: string;
    average: number;
    compare: number;
    compareTo: number;
    budget: number;
  }[];
  averageRange?: {
    startMonth: string | null;
    endMonth: string | null;
    months: string[];
  };
  startDate?: string;
  endDate?: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
};

export type DataEntity = {
  data?: GroupedEntity[];
  intervalData: IntervalEntity[];
  groupedData?: GroupedEntity[] | null;
  legend?: LegendEntity[];
  startDate?: string;
  endDate?: string;
  totalDebts: number;
  totalAssets: number;
  netAssets: number;
  netDebts: number;
  totalTotals: number;
  totalBudgeted: number;
  scopeTagNames?: string[];
};

export type LegendEntity = {
  name: string;
  id: string | null;
  color: string;
  dataKey: string; // Uses id for unique data lookup when categories have same name
  uncategorizedId?: 'off_budget' | 'transfer' | 'other' | 'all';
  bucketTagNames?: string[];
};

export type IntervalEntity = {
  date: string;
  change?: number;
  intervalStartDate?: string;
  intervalEndDate?: string;
  totalAssets: number;
  totalDebts: number;
  netAssets: number;
  netDebts: number;
  totalTotals: number;
  totalBudgeted: number;
};

export type GroupedEntity = {
  id: string;
  name: string;
  uncategorizedId?: 'off_budget' | 'transfer' | 'other' | 'all';
  date?: string;
  intervalData: IntervalEntity[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
  netAssets: number;
  netDebts: number;
  totalBudgeted: number;
  categories?: GroupedEntity[];
  bucketTagNames?: string[];
};

export type Interval = {
  interval: string;
};

export type CustomReportData = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  date_static: number;
  date_range: string;
  mode: string;
  group_by: string;
  sort_by: sortByOpType;
  balance_type: string;
  show_empty: number;
  show_offbudget: number;
  show_hidden: number;
  include_current: number;
  show_uncategorized: number;
  trim_intervals: number;
  show_trend_lines: number;
  graph_type: string;
  conditions?: RuleConditionEntity[];
  conditions_op: 'and' | 'or';
  metadata?: CustomReportStoredMetadata;
  interval: string;
  color_scheme?: string;
};
