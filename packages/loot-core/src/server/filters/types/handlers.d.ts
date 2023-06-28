export interface FiltersHandlers {
  'filter-create': () => Promise<{
    filter: object;
  }>;

  'filter-update': () => Promise<{
    filter: object;
  }>;

  'filter-delete': () => Promise<{ id: string }>;
}
