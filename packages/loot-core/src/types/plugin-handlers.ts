import {
  type ActualPluginManifest,
  type PluginFileCollection,
} from '@actual-app/plugins-core/server';

//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
import type {
  SqlParameter,
  DatabaseResult,
  DatabaseOperation,
  AQLQueryResult,
  AQLQueryOptions,
  Query,
  PluginMigration,
} from '@actual-app/plugins-core/server';
*/

export interface PluginHandlers {
  'plugin-files': (args: {
    pluginUrl: string;
  }) => Promise<PluginFileCollection>;
  'plugin-sync-server-install': (args: {
    zipBytes: number[];
  }) => Promise<{ manifest: ActualPluginManifest }>;
  'plugin-sync-server-list': () => Promise<ActualPluginManifest[]>;
  'plugin-sync-server-register-dev': (args: {
    manifestUrl: string;
  }) => Promise<{ manifest: ActualPluginManifest }>;
  //. This is part of the full plugin support system that was removed from the initial bank sync MVP
  /*
  'plugin-create-database': (args: {
    pluginId: string;
  }) => Promise<{ success: boolean }>;
  'plugin-database-query': (args: {
    pluginId: string;
    sql: string;
    params?: SqlParameter[];
    fetchAll?: boolean;
  }) => Promise<DatabaseResult>;
  'plugin-database-exec': (args: {
    pluginId: string;
    sql: string;
  }) => Promise<{ success: boolean }>;
  'plugin-database-transaction': (args: {
    pluginId: string;
    operations: DatabaseOperation[];
  }) => Promise<DatabaseResult[]>;
  'plugin-run-migrations': (args: {
    pluginId: string;
    migrations: PluginMigration[];
  }) => Promise<{
    success: boolean;
    results: Array<{ migrationId: string; status: string; error?: string }>;
  }>;
  'plugin-database-get-migrations': (args: {
    pluginId: string;
  }) => Promise<string[]>;
  'plugin-database-set-metadata': (args: {
    pluginId: string;
    key: string;
    value: string;
  }) => Promise<{ success: boolean }>;
  'plugin-database-get-metadata': (args: {
    pluginId: string;
    key: string;
  }) => Promise<string>;
  'plugin-aql-query': (args: {
    pluginId: string;
    query: Query;
    options?: AQLQueryOptions;
  }) => Promise<AQLQueryResult>;
  */
  'cors-proxy': (args: {
    url: string;
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  }) => Promise<
    | string
    | { data: number[]; contentType: string; isBinary: true }
    | { error: string; details?: string }
  >;
}
