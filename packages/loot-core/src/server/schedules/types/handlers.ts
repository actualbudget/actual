export interface SchedulesHandlers {
  'schedule/create': (arg: {
    schedule: unknown;
    conditions: unknown[];
  }) => Promise<string>;

  'schedule/update': (schedule: {
    schedule;
    conditions?;
    resetNextDate?: boolean;
  }) => Promise<void>;

  'schedule/delete': (arg: { id: string }) => Promise<void>;

  'schedule/skip-next-date': (arg: { id: string }) => Promise<void>;

  'schedule/post-transaction': (arg: { id: string }) => Promise<void>;

  'schedule/force-run-service': () => Promise<unknown>;

  'schedule/discover': () => Promise<unknown>;

  'schedule/get-upcoming-dates': (arg: {
    config;
    count: number;
  }) => Promise<string[]>;
}
