// @ts-strict-ignore
import type {
  ActualPluginManifest,
  PluginFileCollection,
} from '@actual-app/plugins-core/server';

import * as asyncStorage from '#platform/server/asyncStorage';
import { fetch } from '#platform/server/fetch';
import * as idb from '#platform/server/indexeddb';
import { logger } from '#platform/server/log';
import { createApp } from '#server/app';
import { getServer } from '#server/server-config';
import type { ActualPluginStored } from '#types/models';

import { extractZipToMap } from './pluginUtil';

export type PluginsHandlers = {
  'plugin-files': typeof getPluginFiles;
  'plugin-sync-server-install': typeof installSyncServerPlugin;
  'plugin-sync-server-list': typeof listSyncServerPlugins;
  'plugin-sync-server-register-dev': typeof registerSyncServerDevPlugin;
  //. This is part of the full plugin support system that was removed from the initial bank sync MVP
  /*
  'plugin-create-database': typeof createPluginDatabase;
  'plugin-database-query': typeof queryPluginDatabase;
  'plugin-database-exec': typeof execPluginDatabase;
  'plugin-database-transaction': typeof transactionPluginDatabase;
  'plugin-run-migrations': typeof runPluginMigrations;
  'plugin-database-get-migrations': typeof getPluginMigrations;
  'plugin-database-set-metadata': typeof setPluginMetadata;
  'plugin-database-get-metadata': typeof getPluginMetadata;
  'plugin-aql-query': typeof queryPluginAql;
  */
  'cors-proxy': typeof corsProxy;
};

export const app = createApp<PluginsHandlers>();

app.method('plugin-files', getPluginFiles);
app.method('plugin-sync-server-install', installSyncServerPlugin);
app.method('plugin-sync-server-list', listSyncServerPlugins);
app.method('plugin-sync-server-register-dev', registerSyncServerDevPlugin);
//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
app.method('plugin-create-database', createPluginDatabase);
app.method('plugin-database-query', queryPluginDatabase);
app.method('plugin-database-exec', execPluginDatabase);
app.method('plugin-database-transaction', transactionPluginDatabase);
app.method('plugin-run-migrations', runPluginMigrations);
app.method('plugin-database-get-migrations', getPluginMigrations);
app.method('plugin-database-set-metadata', setPluginMetadata);
app.method('plugin-database-get-metadata', getPluginMetadata);
app.method('plugin-aql-query', queryPluginAql);
*/
app.method('cors-proxy', corsProxy);

async function getPluginFiles({
  pluginUrl,
}: {
  pluginUrl: string;
}): Promise<PluginFileCollection> {
  const decodedPluginUrl = decodeURIComponent(pluginUrl);

  if (decodedPluginUrl.startsWith('sync-server:')) {
    return getSyncServerPluginFiles(
      decodedPluginUrl.slice('sync-server:'.length),
    );
  }

  const { store } = idb.getStore(await idb.getDatabase(), 'plugins');
  const item = (await idb.get(store, decodedPluginUrl)) as unknown as
    | ActualPluginStored
    | undefined;

  if (item == null) {
    throw new Error('Plugin does not exist: ' + decodedPluginUrl);
  }

  if (item.plugin == null) {
    throw new Error('Plugin does not have local files: ' + item.name);
  }

  const filesMap = await extractZipToMap(item.plugin);

  return [...filesMap.entries()].map(([name, content]) => ({
    name: normalizeFrontendFileName(name.toString()),
    content: content.toString(),
  })) as PluginFileCollection;
}

function normalizeFrontendFileName(fileName: string) {
  return fileName.startsWith('frontend/')
    ? fileName.slice('frontend/'.length)
    : fileName;
}

async function getPluginServerHeaders() {
  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    throw new Error('unauthorized');
  }

  return {
    'X-ACTUAL-TOKEN': userToken,
  };
}

function getPluginServerBaseUrl() {
  const serverConfig = getServer();
  if (!serverConfig) {
    throw new Error('no-server-configured');
  }

  return `${serverConfig.BASE_SERVER}/plugins-api`;
}

async function installSyncServerPlugin({
  zipBytes,
}: {
  zipBytes: number[];
}): Promise<{ manifest: ActualPluginManifest }> {
  const response = await fetch(`${getPluginServerBaseUrl()}/install`, {
    method: 'POST',
    headers: {
      ...(await getPluginServerHeaders()),
      'Content-Type': 'application/zip',
    },
    body: new Uint8Array(zipBytes),
  });

  return unwrapPluginServerResponse(response);
}

async function listSyncServerPlugins(): Promise<ActualPluginManifest[]> {
  const response = await fetch(`${getPluginServerBaseUrl()}/list`, {
    headers: await getPluginServerHeaders(),
  });
  const result = await unwrapPluginServerResponse<{
    plugins: ActualPluginManifest[];
  }>(response);
  return result.plugins;
}

async function registerSyncServerDevPlugin({
  manifestUrl,
}: {
  manifestUrl: string;
}): Promise<{ manifest: ActualPluginManifest }> {
  const response = await fetch(`${getPluginServerBaseUrl()}/dev/register`, {
    method: 'POST',
    headers: {
      ...(await getPluginServerHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ manifestUrl }),
  });

  return unwrapPluginServerResponse(response);
}

async function getSyncServerPluginFiles(
  pluginName: string,
): Promise<PluginFileCollection> {
  const response = await fetch(
    `${getPluginServerBaseUrl()}/files/${encodeURIComponent(pluginName)}`,
    {
      headers: await getPluginServerHeaders(),
    },
  );
  const result = await unwrapPluginServerResponse<{
    files: PluginFileCollection;
  }>(response);
  return result.files;
}

async function unwrapPluginServerResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Plugin server request failed: ${response.status}`);
  }

  const parsed = JSON.parse(text);
  if (parsed.status !== 'ok') {
    throw new Error(parsed.reason || parsed.error || 'Plugin request failed');
  }

  return parsed.data as T;
}

//. This is part of the full plugin support system that was removed from the initial bank sync MVP
/*
type PluginDb = Awaited<ReturnType<typeof sqlite.openDatabase>>;

const pluginDatabases = new Map<string, PluginDb>();

async function createPluginDatabase({ pluginId }: { pluginId: string }) {
  if (pluginDatabases.has(pluginId)) {
    return { success: true };
  }

  const pluginDir = fs.getPluginDir(pluginId);

  if (!(await fs.exists(pluginDir))) {
    const pluginsBaseDir = fs.join(fs.getDocumentDir(), 'plugins');
    if (!(await fs.exists(pluginsBaseDir))) {
      await fs.mkdir(pluginsBaseDir);
    }

    await fs.mkdir(pluginDir);
  }

  const dbPath = fs.join(pluginDir, 'db.sqlite');

  if (!(await fs.exists(dbPath))) {
    await fs.copyFile(fs.bundledDatabasePath, dbPath);
  }

  const db = await sqlite.openDatabase(dbPath);
  await sqlite.execQuery(
    db,
    `
      CREATE TABLE IF NOT EXISTS __plugin_migrations__ (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS __plugin_metadata__ (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `,
  );

  pluginDatabases.set(pluginId, db);
  return { success: true };
}

function getPluginDatabase(pluginId: string): PluginDb {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }
  return db;
}

function convertParams(params: SqlParameter[]): (string | number)[] {
  return params.map(p => {
    if (p === null) return '';
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Buffer) return p.toString();
    return p as string | number;
  });
}

async function queryPluginDatabase({
  pluginId,
  sql,
  params = [],
  fetchAll = false,
}: {
  pluginId: string;
  sql: string;
  params?: SqlParameter[];
  fetchAll?: boolean;
}): Promise<DatabaseResult> {
  const db = getPluginDatabase(pluginId);
  const convertedParams = convertParams(params);
  return fetchAll
    ? (sqlite.runQuery(db, sql, convertedParams, true) as DatabaseResult)
    : (sqlite.runQuery(db, sql, convertedParams, false) as DatabaseResult);
}

async function execPluginDatabase({
  pluginId,
  sql,
}: {
  pluginId: string;
  sql: string;
}) {
  const db = getPluginDatabase(pluginId);
  await sqlite.execQuery(db, sql);
  return { success: true };
}

async function transactionPluginDatabase({
  pluginId,
  operations,
}: {
  pluginId: string;
  operations: DatabaseOperation[];
}): Promise<DatabaseResult[]> {
  const db = getPluginDatabase(pluginId);
  const results: DatabaseResult[] = [];

  sqlite.transaction(db, () => {
    for (const op of operations) {
      if (op.type === 'exec') {
        sqlite.execQuery(db, op.sql);
        results.push({ changes: 0 });
      } else {
        const convertedParams = convertParams(op.params || []);
        const result = op.fetchAll
          ? sqlite.runQuery(db, op.sql, convertedParams, true)
          : sqlite.runQuery(db, op.sql, convertedParams, false);
        results.push(result as DatabaseResult);
      }
    }
  });

  return results;
}

async function runPluginMigrations({
  pluginId,
  migrations,
}: {
  pluginId: string;
  migrations: PluginMigration[];
}) {
  const db = getPluginDatabase(pluginId);
  const appliedMigrations = sqlite.runQuery<{ id: string }>(
    db,
    'SELECT id FROM __plugin_migrations__ ORDER BY applied_at',
    [],
    true,
  ) as { id: string }[];
  const appliedIds = new Set(appliedMigrations.map(row => row.id));
  const results = [];

  for (const migration of migrations.sort((a, b) => a[0] - b[0])) {
    const [timestamp, name, upCommand] = migration;
    const migrationId = `${timestamp}_${name}`;

    if (appliedIds.has(migrationId)) {
      results.push({ migrationId, status: 'already_applied' });
      continue;
    }

    try {
      sqlite.transaction(db, () => {
        sqlite.execQuery(db, upCommand);
        sqlite.runQuery(
          db,
          'INSERT INTO __plugin_migrations__ (id) VALUES (?)',
          [migrationId],
        );
      });

      results.push({ migrationId, status: 'applied' });
    } catch (error) {
      logger.error(
        `Plugin ${pluginId} migration ${migrationId} failed:`,
        error,
      );
      results.push({
        migrationId,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  return { success: true, results };
}

async function getPluginMigrations({ pluginId }: { pluginId: string }) {
  const db = getPluginDatabase(pluginId);
  const rows = sqlite.runQuery<{ id: string }>(
    db,
    'SELECT id FROM __plugin_migrations__ ORDER BY applied_at',
    [],
    true,
  ) as { id: string }[];
  return rows.map(row => row.id);
}

async function setPluginMetadata({
  pluginId,
  key,
  value,
}: {
  pluginId: string;
  key: string;
  value: string;
}) {
  const db = getPluginDatabase(pluginId);
  sqlite.runQuery(
    db,
    'INSERT OR REPLACE INTO __plugin_metadata__ (key, value) VALUES (?, ?)',
    [key, JSON.stringify(value)],
  );
  return { success: true };
}

async function getPluginMetadata({
  pluginId,
  key,
}: {
  pluginId: string;
  key: string;
}) {
  const db = getPluginDatabase(pluginId);
  const row = sqlite.runQuery(
    db,
    'SELECT value FROM __plugin_metadata__ WHERE key = ?',
    [key],
    false,
  ) as unknown as { value: string } | null;
  return row ? JSON.parse(row.value) : null;
}

type PluginSchemaField = {
  type: string;
  required: boolean;
  default?: unknown;
};

type PluginTableSchema = Record<string, PluginSchemaField>;
type PluginSchema = Record<string, PluginTableSchema>;

const pluginSchemas = new Map<string, PluginSchema>();

async function introspectPluginSchema(pluginId: string): Promise<PluginSchema> {
  if (pluginSchemas.has(pluginId)) {
    return pluginSchemas.get(pluginId)!;
  }

  const db = getPluginDatabase(pluginId);
  const tables = sqlite.runQuery<{ name: string }>(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__plugin_%'",
    [],
    true,
  ) as { name: string }[];
  const schema: PluginSchema = {};

  for (const table of tables) {
    const tableInfo = sqlite.runQuery<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: unknown;
    }>(db, `PRAGMA table_info(${table.name})`, [], true);

    schema[table.name] = {};
    for (const column of tableInfo) {
      schema[table.name][column.name] = {
        type: mapSQLiteTypeToAQL(column.type.toUpperCase()),
        required: column.notnull === 1 && column.dflt_value === null,
        ...(column.dflt_value !== null && { default: column.dflt_value }),
      };
    }
  }

  pluginSchemas.set(pluginId, schema);
  return schema;
}

function mapSQLiteTypeToAQL(sqliteType: string): string {
  switch (sqliteType) {
    case 'INTEGER':
      return 'integer';
    case 'REAL':
    case 'NUMERIC':
      return 'float';
    case 'BOOLEAN':
      return 'boolean';
    case 'DATE':
      return 'date';
    case 'JSON':
      return 'json';
    case 'TEXT':
    case 'DATETIME':
    default:
      return 'string';
  }
}

async function queryPluginAql({
  pluginId,
  query,
  options = {},
}: {
  pluginId: string;
  query: Query;
  options?: AQLQueryOptions;
}) {
  const { target = 'plugin', params = {} } = options;

  if (target === 'host') {
    return aqlQuery(query.state, { params });
  }

  const db = getPluginDatabase(pluginId);
  const normalizedQuery = {
    table: query.state.table,
    tableOptions: query.state.tableOptions || {},
    filterExpressions: query.state.filterExpressions || [],
    selectExpressions: query.state.selectExpressions || ['*'],
    groupExpressions: query.state.groupExpressions || [],
    orderExpressions: query.state.orderExpressions || [],
    calculation: query.state.calculation || false,
    rawMode: query.state.rawMode || false,
    withDead: query.state.withDead || false,
    validateRefs: query.state.validateRefs !== false,
    limit: query.state.limit || null,
    offset: query.state.offset || null,
  };

  const pluginSchema = await introspectPluginSchema(pluginId);
  const pluginSchemaConfig = {
    tableViews: {},
    tableFilters: () => [],
    customizeQuery: queryState => ({
      ...queryState,
      orderExpressions:
        queryState.orderExpressions && queryState.orderExpressions.length > 0
          ? queryState.orderExpressions.concat(['id'])
          : ['id'],
    }),
    views: {},
  };

  const { sqlPieces, state } = compileQuery(
    normalizedQuery,
    pluginSchema,
    pluginSchemaConfig,
  );
  const paramArray = state.namedParameters.map(param => {
    const name = param.paramName;
    if (params[name] === undefined) {
      throw new Error(`Parameter ${name} not provided to query`);
    }
    return convertInputType(params[name], param.paramType);
  });
  const sql = defaultConstructQuery(normalizedQuery, state, sqlPieces);
  let data = sqlite.runQuery(
    db,
    sql,
    paramArray,
    true,
  ) as unknown as DatabaseSelectResult | null;

  if (Array.isArray(data)) {
    for (const item of data) {
      Object.keys(item).forEach(name => {
        if (state.outputTypes.has(name)) {
          item[name] = convertOutputType(
            item[name],
            state.outputTypes.get(name),
          );
        }
      });
    }
  }

  if (normalizedQuery.calculation) {
    if (Array.isArray(data) && data.length > 0) {
      const row = data[0];
      const [key] = Object.keys(row);
      data = (row[key] || 0) as unknown as DatabaseSelectResult;
    } else {
      data = null as unknown as DatabaseSelectResult;
    }
  }

  return { data, dependencies: state.dependencies };
}
*/

async function corsProxy({
  url,
  method = 'GET',
  body,
  headers,
}: {
  url: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}) {
  try {
    const userToken = await asyncStorage.getItem('user-token');

    if (!userToken) {
      return { error: 'unauthorized' };
    }

    const serverConfig = getServer();
    if (!serverConfig) {
      return { error: 'no-server-configured' };
    }

    const proxyUrl =
      serverConfig.CORS_PROXY + `?url=${encodeURIComponent(url)}`;
    const defaultHeaders = {
      'x-requested-with': 'actual-budget',
      'user-agent': 'Actual-Budget-Plugin-System',
    };

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'X-ACTUAL-TOKEN': userToken,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({
        method,
        body,
        headers: {
          ...defaultHeaders,
          ...headers,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        return JSON.parse(errorText);
      } catch {
        return { error: 'network-failure', details: errorText };
      }
    }

    const contentType = response.headers.get('content-type');
    const isLikelyJson =
      contentType?.includes('application/json') ||
      url.toLowerCase().includes('.json') ||
      url.toLowerCase().includes('/manifest') ||
      url.toLowerCase().includes('manifest.json');

    if (isLikelyJson) {
      const text = await response.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } else if (contentType?.includes('text/')) {
      return response.text();
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      data: Array.from(new Uint8Array(arrayBuffer)),
      contentType,
      isBinary: true,
    };
  } catch (error) {
    logger.error('CORS proxy error:', error);
    return {
      error: 'network-failure',
      details: error instanceof Error ? error.message : String(error),
    };
  }
}
