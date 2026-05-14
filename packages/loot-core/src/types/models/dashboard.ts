import type { CustomReportEntity } from './reports';
import type { RuleConditionEntity } from './rule';

export type DashboardPageEntity = {
  id: string;
  name: string;
  tombstone: boolean;
};

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
    | 'priorYearToDate'
    | 'next3months'
    | 'next6months'
    | 'next12months'
    | 'last3next3months'
    | 'last6next6months';
};
