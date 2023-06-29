export interface FiltersHandlers {
  'filter-create': (filter: object) => Promise<string>;

  'filter-update': (filter: object) => Promise<void>;

  'filter-delete': (id: string) => Promise<void>;
}
