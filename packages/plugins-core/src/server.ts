/**
 * Server-Only Exports for @actual-app/plugins-core
 *
 * This file contains only types and utilities that can be used in server environments
 * (Web Workers, Node.js) without any DOM dependencies or React components.
 */

// Database types
export type {
  SqlParameter,
  DatabaseQueryResult,
  DatabaseRow,
  DatabaseSelectResult,
  DatabaseResult,
  DatabaseOperation,
  PluginMetadata,
} from './types/database';

// Plugin file types
export type { PluginFile, PluginFileCollection } from './types/plugin-files';

// AQL query result types
export type { AQLQueryResult, AQLQueryOptions } from './types/aql-result';

// Model types (server-safe)
export type * from './types/models';

// Plugin types (server-safe ones)
export type {
  PluginDatabase,
  PluginSpreadsheet,
  PluginBinding,
  PluginCellValue,
  PluginFilterCondition,
  PluginFilterResult,
  PluginConditionValue,
  PluginMigration,
  PluginContext,
  ContextEvent,
} from './types/actualPlugin';

export type { ActualPluginEntry } from './types/actualPluginEntry';
export type { ActualPluginManifest } from './types/actualPluginManifest';

// Query System (server-safe)
export {
  Query,
  q,
  getPrimaryOrderBy,
  type QueryState,
  type QueryBuilder,
  type ObjectExpression,
} from './query';
