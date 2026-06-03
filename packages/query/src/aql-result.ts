import type { DatabaseRow } from './database';

export type AQLQueryResult = {
  data: DatabaseRow[] | DatabaseRow | null;
  dependencies: string[];
};

export type AQLQueryOptions = {
  target?: 'plugin' | 'host';
  params?: Record<string, string | number | boolean | null>;
};
