import { DataEntity } from '../../../../desktop-client/src/components/reports/entities';

import { RuleConditionEntity } from './rule';

export interface CustomReportEntity {
  id: string;
  mode: string;
  groupBy: string;
  balanceType: string;
  showEmpty: boolean;
  showOffBudgetHidden: boolean;
  showUncategorized: boolean;
  graphType: string;
  selectedCategories;
  filters?: RuleConditionEntity[];
  conditionsOp: string;
  name: string;
  startDate: string;
  endDate: string;
  isDateStatic: boolean;
  data?: DataEntity;
  tombstone?: boolean;
}

export interface CustomReportData extends CustomReportEntity {
  conditions_op?: string;
  conditions?: RuleConditionEntity[];
}
