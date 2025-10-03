/**
 * AQL Query Result Types
 *
 * Types for AQL (Advanced Query Language) query results.
 */

import { DatabaseRow } from './database';

/**
 * Result of an AQL query operation
 */
export interface AQLQueryResult {
  /** The actual data returned by the query */
  data: DatabaseRow[] | DatabaseRow | null;
  /** List of table/field dependencies detected during query execution */
  dependencies: string[];
}

/**
 * Options for AQL query execution
 */
export interface AQLQueryOptions {
  /** Target for the query - 'plugin' uses plugin DB, 'host' uses main DB */
  target?: 'plugin' | 'host';
  /** Parameters to be passed to the query */
  params?: Record<string, string | number | boolean | null>;
}
