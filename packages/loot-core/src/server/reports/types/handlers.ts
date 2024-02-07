import { type CustomReportEntity } from '../../../types/models';

export interface ReportsHandlers {
  'report/create': (report: CustomReportEntity) => Promise<any>;

  'report/update': (report: CustomReportEntity) => Promise<any>;

  'report/delete': (id: string) => Promise<void>;
}
