/**
 * Plugin Database Types
 *
 * Shared types for database operations between plugins and the host application.
 */

/**
 * Parameters that can be passed to SQL queries
 */
export type SqlParameter = string | number | boolean | null | Buffer;

/**
 * Result of a database query operation (INSERT, UPDATE, DELETE)
 */
export interface DatabaseQueryResult {
  changes: number;
  insertId?: number;
}

/**
 * Row returned from a database SELECT query
 */
export type DatabaseRow = Record<string, SqlParameter>;

/**
 * Result of a database SELECT query
 */
export type DatabaseSelectResult = DatabaseRow[];

/**
 * Union type for all possible database query results
 */
export type DatabaseResult = DatabaseQueryResult | DatabaseSelectResult;

/**
 * Database transaction operation
 */
export interface DatabaseOperation {
  type: 'exec' | 'query';
  sql: string;
  params?: SqlParameter[];
  fetchAll?: boolean; // Only used for query operations
}

/**
 * Plugin database metadata key-value pair
 */
export interface PluginMetadata {
  key: string;
  value: string;
}
