export interface FiltersHandlers {
  'filter/create': () => Promise<unknown>;

  'filter/update': () => Promise<unknown>;

  'filter/delete': () => Promise<unknown>;

  'filter-create': () => Promise<unknown>;

  'filter-update': () => Promise<unknown>;

  'filter-delete': () => Promise<unknown>;
}
