import { type RuleConditionEntity } from './rule';

export interface CustomReportEntity {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isDateStatic: boolean;
  dateRange: string;
  mode: string;
  groupBy: string;
  interval: string;
  balanceType: string;
  showEmpty: boolean;
  showOffBudget: boolean;
  showHiddenCategories: boolean;
  includeCurrentInterval: boolean;
  showUncategorized: boolean;
  graphType: string;
  conditions?: RuleConditionEntity[];
  conditionsOp: 'and' | 'or';
  data?: GroupedEntity;
  tombstone?: boolean;
}

export type balanceTypeOpType =
  | 'totalAssets'
  | 'totalDebts'
  | 'totalTotals'
  | 'netAssets'
  | 'netDebts';

export type spendingReportTimeType =
  | 'average'
  | 'thisMonth'
  | 'lastMonth'
  | 'twoMonthsPrevious'
  | 'lastYear'
  | 'lastYearPrevious';

export type SpendingMonthEntity = Record<
  string | number,
  {
    cumulative: number;
    daily: number;
    date: string;
    month: string;
  }
>;

export interface SpendingDataEntity {
  date: string;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
  cumulative: number;
}

export interface SpendingEntity {
  intervalData: {
    months: SpendingMonthEntity;
    day: string;
    average: number;
    thisMonth: number;
    lastMonth: number;
    twoMonthsPrevious: number;
    lastYear: number;
    lastYearPrevious: number;
  }[];
  startDate?: string;
  endDate?: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
}

export interface DataEntity {
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
}

type LegendEntity = {
  name: string;
  id: string | null;
  color: string;
};

export type IntervalEntity = {
  date?: string;
  change?: number;
  intervalStartDate?: string;
  intervalEndDate?: string;
  totalAssets: number;
  totalDebts: number;
  netAssets: number;
  netDebts: number;
  totalTotals: number;
};

export interface GroupedEntity {
  id: string;
  name: string;
  date?: string;
  intervalData: IntervalEntity[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
  netAssets: number;
  netDebts: number;
  categories?: GroupedEntity[];
}

export type Interval = {
  interval: string;
};

export interface CustomReportData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  date_static: number;
  date_range: string;
  mode: string;
  group_by: string;
  balance_type: string;
  show_empty: number;
  show_offbudget: number;
  show_hidden: number;
  include_current: number;
  show_uncategorized: number;
  graph_type: string;
  conditions?: RuleConditionEntity[];
  conditions_op: 'and' | 'or';
  metadata?: GroupedEntity;
  interval: string;
  color_scheme?: string;
}
