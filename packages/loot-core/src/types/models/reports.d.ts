import { CategoryEntity } from './category';
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
  showUncategorized: boolean;
  selectedCategories?: CategoryEntity[];
  graphType: string;
  conditions?: RuleConditionEntity[];
  conditionsOp: string;
  data?: GroupedEntity;
  tombstone?: boolean;
}

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
  }[];
  startDate?: string;
  endDate?: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
}

export interface GroupedEntity {
  data?: DataEntity[];
  intervalData: DataEntity[];
  groupedData?: DataEntity[] | null;
  legend?: LegendEntity[];
  startDate?: string;
  endDate?: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
}

type LegendEntity = {
  name: string;
  id: string | null;
  color: string;
};

export type ItemEntity = {
  id: string;
  name: string;
  intervalData: IntervalData[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

export type IntervalData = {
  date: string;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

export interface DataEntity {
  id: string;
  name: string;
  date?: string;
  intervalData: IntervalData[];
  categories?: ItemEntity[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
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
  show_uncategorized: number;
  selected_categories?: CategoryEntity[];
  graph_type: string;
  conditions?: RuleConditionEntity[];
  conditions_op: string;
  metadata?: GroupedEntity;
  interval: string;
  color_scheme?: string;
}
