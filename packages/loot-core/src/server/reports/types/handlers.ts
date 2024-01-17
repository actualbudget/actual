export interface ReportsHandlers {
  'report-create': (arg: { state: object }) => Promise<string>;

  'report-update': (report: object) => Promise<void>;

  'report-delete': (id: string) => Promise<void>;
}
