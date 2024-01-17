import { DataEntity } from "../../../../desktop-client/src/components/reports/entities";

export interface CustomReportEntity {
  reportId?: string;
  mode: string;
  groupBy: string;
  balanceType: string;
  showEmpty: boolean;
  showOffBudgetHidden: boolean;
  showUncategorized: boolean;
  graphType: string;
  selectedCategories;
  filters;
  conditionsOp: string;
  name: string;
  startDate: string;
  endDate: string;
  isDateStatic: boolean;
  data: DataEntity;
  tombstone?: boolean;
}
