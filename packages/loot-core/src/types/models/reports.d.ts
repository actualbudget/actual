import { CategoryEntity } from './category';
import { type RuleConditionEntity } from './rule';

export interface CustomReportEntity {
  id: string | undefined;
  name: string;
  startDate: string;
  endDate: string;
  isDateStatic: boolean;
  dateRange: string;
  mode: string;
  groupBy: string;
  balanceType: string;
  showEmpty: boolean;
  showOffBudget: boolean;
  showHidden?: boolean;
  showUncategorized: boolean;
  selectedCategories: CategoryEntity[];
  graphType: string;
  conditions?: RuleConditionEntity[];
  conditionsOp: string;
  data?: GroupedEntity;
  tombstone?: boolean;
}

export interface GroupedEntity {
  data: DataEntity[];
  monthData: DataEntity[];
  groupedData: DataEntity[];
  legend: LegendEntity[];
  startDate: string;
  endDate: string;
  totalDebts: number;
  totalAssets: number;
  totalTotals: number;
}

type LegendEntity = {
  name: string;
  color: string;
};

export type ItemEntity = {
  id: string;
  name: string;
  monthData: MonthData[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

export type MonthData = {
  date: string;
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
};

export interface DataEntity {
  id: string;
  name: string;
  date?: string;
  monthData: MonthData[];
  categories?: ItemEntity[];
  totalAssets: number;
  totalDebts: number;
  totalTotals: number;
}

export type Month = {
  month: string;
};

export interface CustomReportData extends CustomReportEntity {
  conditions_op?: string;
  conditions?: RuleConditionEntity[];
}
