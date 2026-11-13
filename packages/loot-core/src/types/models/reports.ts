import type { RuleConditionEntity } from './rule';

export type CustomReportTagScope =
  | { mode: 'all' }
  | { mode: 'selected'; tagIds: string[] };

export type CustomReportMetadata = Record<string, unknown>;

// What the report's data is offset against: a date range, by its daily
// average, or each interval's own window an offset back in time
export type CustomReportComparison = {
  enabled: boolean;
  dateRange: string;
  isDateStatic: boolean;
  startDate: string;
  endDate: string;
  includeCurrentInterval: boolean;
  // Project amounts so far over the report's whole range, by days elapsed
  projectToFullPeriod: boolean;
  // Draw graphs as changes from the comparison, rather than as amounts with the
  // comparison drawn in. Optional since older reports don't store it.
  showChanges?: boolean;
  // The amount rows sort by. Without it, rows sort by the current amount when
  // drawing amounts, and by the change when drawing changes.
  sortAmount?: CustomReportComparisonSortAmount;
  // Compare against what was spent over the range, or the average of what
  // was budgeted for it. Optional since older reports don't store it.
  source?: CustomReportComparisonSource;
  // Optional since older reports don't store them, and those use a range
  mode?: CustomReportComparisonMode;
  offsetCount?: number;
  offsetUnit?: CustomReportComparisonOffsetUnit;
  // Scale each offset window to its interval's number of days, so windows
  // of different lengths compare by their daily average
  compareDailyAverage?: boolean;
};

export type CustomReportComparisonSource = 'actual' | 'budgeted';

export type CustomReportComparisonMode = 'range' | 'offset';

export type CustomReportComparisonSortAmount =
  | 'current'
  | 'comparison'
  | 'change';

// Intervals are the report's own interval, and ranges its whole date range
export type CustomReportComparisonOffsetUnit =
  | 'days'
  | 'weeks'
  | 'months'
  | 'years'
  | 'intervals'
  | 'ranges';

type CustomReportStoredMetadata = CustomReportMetadata & {
  tagScope?: CustomReportTagScope;
  comparison?: CustomReportComparison;
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
  comparison?: CustomReportComparison;
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

export type ReportValues = Record<balanceTypeOpType, number>;

// What an amount offset against a comparison was built from
export type ComparisonBreakdown = {
  // The comparison's daily average over the same number of days
  expected: ReportValues;
  actual: ReportValues;
  // A row's or total's actual amount projected over the whole range from its
  // pace so far. Single intervals aren't projected.
  projected?: ReportValues;
  // The comparison over an average-length interval, for tables and summaries
  perInterval?: ReportValues;
  // The comparison over an interval that hasn't started, which compares
  // nothing yet but lets charts draw the comparison ahead
  upcoming?: ReportValues;
  // The actual amount at its pace so far over an average-length interval, to
  // compare against perInterval
  pacePerInterval?: ReportValues;
  // The comparison is the average of what was budgeted, not what was spent
  budgeted?: boolean;
  // An offset comparison's window is before the earliest transaction, so there
  // is nothing to compare against
  noData?: boolean;
};

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
  comparison?: ComparisonBreakdown;
  comparisonStartDate?: string;
  comparisonEndDate?: string;
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
  comparison?: ComparisonBreakdown;
  // When graphs draw amounts against a comparison: the interval's amount, which
  // is null before it starts, and its comparison
  amount?: number | null;
  comparisonAmount?: number | null;
  // With an offset comparison: the past window this interval is compared with
  comparisonStartDate?: string;
  comparisonEndDate?: string;
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
  comparison?: ComparisonBreakdown;
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
