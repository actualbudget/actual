import { type CustomReportEntity } from '../../../types/models';

export interface ReportsHandlers {
  'report/create': (report: CustomReportEntity) => Promise<string>;

  'report/update': (report: CustomReportEntity) => Promise<void>;

  'report/rename': (
    report: Pick<CustomReportEntity, 'id' | 'name'>,
  ) => Promise<void>;

  'report/delete': (id: string) => Promise<void>;
}
