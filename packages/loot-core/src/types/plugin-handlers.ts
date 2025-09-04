import {
  type PluginFileCollection,
  type SqlParameter,
  type DatabaseResult,
  type DatabaseOperation,
  type AQLQueryResult,
  type AQLQueryOptions,
  type Query,
  type PluginMigration,
} from '@actual-app/plugins-core/server';

export interface PluginHandlers {
  'plugin-files': (args: {
    pluginUrl: string;
  }) => Promise<PluginFileCollection>;
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
