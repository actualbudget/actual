export interface ReportsHandlers {
  'report-create': (filter: object) => Promise<string>;

  'report-update': (filter: object) => Promise<void>;

  'report-delete': (id: string) => Promise<void>;
}
