/**
 * Server-Only Exports for @actual-app/plugins-core
 *
 * This file contains only types and utilities that can be used in server environments
 * (Web Workers, Node.js) without any DOM dependencies or React components.
 */

// Database types
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type {
  SqlParameter,
  DatabaseQueryResult,
  DatabaseRow,
  DatabaseSelectResult,
  DatabaseResult,
  DatabaseOperation,
  PluginMetadata,
} from './types/database';
*/

// Plugin file types
export type { PluginFile, PluginFileCollection } from './types/plugin-files';

// AQL query result types
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type { AQLQueryResult, AQLQueryOptions } from './types/aql-result';
*/

// Model types (server-safe)
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  PayeeEntity,
  ScheduleEntity,
} from './types/models';
*/

// Plugin types (server-safe ones)
export type { PluginContext } from './types/actualPlugin';

//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export type {
  PluginDatabase,
  PluginSpreadsheet,
  PluginBinding,
  PluginCellValue,
  PluginFilterCondition,
  PluginFilterResult,
  PluginConditionValue,
  PluginMigration,
  ContextEvent,
} from './types/actualPlugin';
*/

export type { ActualPluginEntry } from './types/actualPluginEntry';
export {
  isFrontendPlugin,
  isSyncServerPlugin,
  validateActualPluginManifest,
} from './types/actualPluginManifest';
export type {
  ActualPluginManifest,
  ActualPluginType,
  ActualPluginFrontendManifest,
  ActualPluginSyncServerManifest,
} from './types/actualPluginManifest';

// Query System (server-safe)
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
export {
  Query,
  q,
  getPrimaryOrderBy,
  type QueryState,
  type QueryBuilder,
  type ObjectExpression,
} from './query';
*/
