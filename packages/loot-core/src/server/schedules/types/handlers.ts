export interface SchedulesHandlers {
  'schedule/create': () => Promise<unknown>;

  'schedule/update': () => Promise<unknown>;

  'schedule/delete': () => Promise<unknown>;

  'schedule/skip-next-date': () => Promise<unknown>;

  'schedule/post-transaction': () => Promise<unknown>;

  'schedule/force-run-service': () => Promise<unknown>;

  'schedule/get-possible-transactions': () => Promise<unknown>;

  'schedule/discover': () => Promise<unknown>;

  'schedule/get-upcoming-dates': () => Promise<unknown>;
}
