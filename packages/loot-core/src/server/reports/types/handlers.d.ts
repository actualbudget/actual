export interface ReportsHandlers {
  'report-create': (report: object) => Promise<string>;

  'report-update': (report: object) => Promise<void>;

  'report-delete': (id: string) => Promise<void>;
}
