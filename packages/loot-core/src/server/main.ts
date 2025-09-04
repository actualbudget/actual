// @ts-strict-ignore
import './polyfills';

import * as injectAPI from '@actual-app/api/injected';
import type {
  SqlParameter,
  DatabaseQueryResult,
  DatabaseSelectResult,
  DatabaseResult,
  PluginFileCollection,
  AQLQueryResult,
  PluginMigration,
} from '@actual-app/plugins-core/server';
import { type Database } from '@jlongster/sql.js';

import * as asyncStorage from '../platform/server/asyncStorage';
import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import * as idb from '../platform/server/indexeddb';
import * as sqlite from '../platform/server/sqlite';
import { q, Query } from '../shared/query';
import { Handlers } from '../types/handlers';
import { ActualPluginStored } from '../types/models/actual-plugin-stored';

import { app as accountsApp } from './accounts/app';
import { app as adminApp } from './admin/app';
import { installAPI } from './api';
import { aqlQuery } from './aql';
import { app as authApp } from './auth/app';
import { app as budgetApp } from './budget/app';
import { app as budgetFilesApp } from './budgetfiles/app';
import { app as dashboardApp } from './dashboard/app';
import * as db from './db';
import * as encryption from './encryption';
import { app as encryptionApp } from './encryption/app';
import { app as filtersApp } from './filters/app';
import { app } from './main-app';
import { mutator, runHandler } from './mutators';
import { app as notesApp } from './notes/app';
import { app as payeesApp } from './payees/app';
import { app as pluginsApp } from './plugins/app';
import { extractZipToMap } from './plugins/pluginUtil';
import { get } from './post';
import { app as preferencesApp } from './preferences/app';
import * as prefs from './prefs';
import { app as reportsApp } from './reports/app';
import { app as rulesApp } from './rules/app';
import { app as schedulesApp } from './schedules/app';
import { getServer, setServer } from './server-config';
import { app as spreadsheetApp } from './spreadsheet/app';
import { fullSync, setSyncingMode } from './sync';
import { app as syncApp } from './sync/app';
import { app as tagsApp } from './tags/app';
import { app as toolsApp } from './tools/app';
import { app as transactionsApp } from './transactions/app';
import * as rules from './transactions/transaction-rules';
import { undo, redo } from './undo';

// handlers

// need to work around the type system here because the object
// is /currently/ empty but we promise to fill it in later
export let handlers = {} as unknown as Handlers;

handlers['undo'] = mutator(async function () {
  return undo();
});

handlers['redo'] = mutator(function () {
  return redo();
});

handlers['make-filters-from-conditions'] = async function ({
  conditions,
  applySpecialCases,
}) {
  return rules.conditionsToAQL(conditions, { applySpecialCases });
};

handlers['query'] = async function (query) {
  if (query['table'] == null) {
    throw new Error('query has no table, did you forgot to call `.serialize`?');
  }

  return aqlQuery(query);
};

handlers['get-server-version'] = async function () {
  if (!getServer()) {
    return { error: 'no-server' };
  }

  let version;
  try {
    const res = await get(getServer().BASE_SERVER + '/info');

    const info = JSON.parse(res);
    version = info.build.version;
  } catch (err) {
    return { error: 'network-failure' };
  }

  return { version };
};

handlers['get-server-url'] = async function () {
  return getServer() && getServer().BASE_SERVER;
};

handlers['set-server-url'] = async function ({ url, validate = true }) {
  if (url == null) {
    await asyncStorage.removeItem('user-token');
  } else {
    url = url.replace(/\/+$/, '');

    if (validate) {
      // Validate the server is running
      const result = await runHandler(handlers['subscribe-needs-bootstrap'], {
        url,
      });
      if ('error' in result) {
        return { error: result.error };
      }
    }
  }

  await asyncStorage.setItem('server-url', url);
  await asyncStorage.setItem('did-bootstrap', true);
  setServer(url);
  return {};
};

handlers['app-focused'] = async function () {
  if (prefs.getPrefs() && prefs.getPrefs().id) {
    // First we sync
    fullSync();
  }
};

handlers['plugin-files'] = async function ({ pluginUrl }) {
  const { store } = idb.getStore(await idb.getDatabase(), 'plugins');
  const item = (await idb.get(
    store,
    decodeURIComponent(pluginUrl),
  )) as unknown as ActualPluginStored;

  if (item == null) {
    throw new Error('Plugin does not exist: ' + decodeURIComponent(pluginUrl));
  }

  const filesMap = await extractZipToMap(item.plugin);

  return [...filesMap.entries()].map(keyValue => ({
    name: keyValue[0].toString(),
    content: keyValue[1].toString(),
  })) as PluginFileCollection;
};

// Plugin database management
const pluginDatabases = new Map<string, Database>();

handlers['plugin-create-database'] = async function ({ pluginId }) {
  // Check if database already exists
  if (pluginDatabases.has(pluginId)) {
    return { success: true };
  }

  try {
    // Create plugin directory (follows same pattern as budget creation)
    const pluginDir = fs.getPluginDir(pluginId);

    // Ensure parent directories exist
    if (!(await fs.exists(pluginDir))) {
      // Create the plugins directory first if it doesn't exist
      const pluginsBaseDir = fs.join(fs.getDocumentDir(), 'plugins');
      if (!(await fs.exists(pluginsBaseDir))) {
        await fs.mkdir(pluginsBaseDir);
      }

      await fs.mkdir(pluginDir);
    }

    // Create the initial database (same as budget creation - filesystem abstraction will handle symlink)
    const dbPath = fs.join(pluginDir, 'db.sqlite');

    if (!(await fs.exists(dbPath))) {
      await fs.copyFile(fs.bundledDatabasePath, dbPath);
    } else {
    }

    // Open the database
    let db;
    try {
      db = await sqlite.openDatabase(dbPath);
    } catch (error) {
      console.error(
        `❌ Database opening failed for plugin ${pluginId}:`,
        error,
      );
      throw error;
    }

    // Step 5: Create infrastructure tables
    try {
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
    } catch (error) {
      console.error(
        `❌ Infrastructure table creation failed for plugin ${pluginId}:`,
        error,
      );
      throw error;
    }

    // Step 6: Store database reference
    try {
      pluginDatabases.set(pluginId, db);
    } catch (error) {
      console.error(
        `❌ Database reference storage failed for plugin ${pluginId}:`,
        error,
      );
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error(
      `💥 Overall plugin database creation failed for ${pluginId}:`,
      error,
    );
    console.error(`💥 Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Helper function to convert SqlParameter[] to sqlite-compatible params
function convertParams(params: SqlParameter[]): (string | number)[] {
  return params.map(p => {
    if (p === null) return '';
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Buffer) return p.toString();
    return p as string | number;
  });
}

handlers['plugin-database-query'] = async function ({
  pluginId,
  sql,
  params = [],
  fetchAll = false,
}) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const convertedParams = convertParams(params);
    if (fetchAll) {
      return sqlite.runQuery(
        db,
        sql,
        convertedParams,
        true,
      ) as DatabaseSelectResult;
    } else {
      return sqlite.runQuery(
        db,
        sql,
        convertedParams,
        false,
      ) as DatabaseQueryResult;
    }
  } catch (error) {
    console.error(`Plugin ${pluginId} database query error:`, error);
    throw error;
  }
};

handlers['plugin-database-exec'] = async function ({ pluginId, sql }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    sqlite.execQuery(db, sql);
    return { success: true };
  } catch (error) {
    console.error(`Plugin ${pluginId} database exec error:`, error);
    throw error;
  }
};

handlers['plugin-database-transaction'] = async function ({
  pluginId,
  operations,
}) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const results: DatabaseResult[] = [];

    sqlite.transaction(db, () => {
      for (const op of operations) {
        if (op.type === 'exec') {
          sqlite.execQuery(db, op.sql);
          results.push({ changes: 0 }); // Exec operations return changes count
        } else if (op.type === 'query') {
          const convertedParams = convertParams(op.params || []);
          if (op.fetchAll) {
            const result = sqlite.runQuery(db, op.sql, convertedParams, true);
            results.push(result as DatabaseSelectResult);
          } else {
            const result = sqlite.runQuery(db, op.sql, convertedParams, false);
            results.push(result as DatabaseQueryResult);
          }
        }
      }
    });

    return results;
  } catch (error) {
    console.error(`Plugin ${pluginId} database transaction error:`, error);
    throw error;
  }
};

handlers['plugin-run-migrations'] = async function ({ pluginId, migrations }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    // Get currently applied migrations
    const appliedMigrations = sqlite.runQuery(
      db,
      'SELECT id FROM __plugin_migrations__ ORDER BY applied_at',
      [],
      true,
    ) as { id: string }[];
    const appliedIds = new Set(appliedMigrations.map(row => row.id));

    const results = [];

    // Sort migrations by timestamp to ensure proper order
    const sortedMigrations = migrations.sort(
      (a: PluginMigration, b: PluginMigration) => a[0] - b[0],
    );

    for (const migration of sortedMigrations) {
      const [timestamp, name, upCommand] = migration;
      const migrationId = `${timestamp}_${name}`;

      if (appliedIds.has(migrationId)) {
        results.push({ migrationId, status: 'already_applied' });
        continue;
      }

      try {
        sqlite.transaction(db, () => {
          // Execute migration
          sqlite.execQuery(db, upCommand);

          // Record migration
          sqlite.runQuery(
            db,
            'INSERT INTO __plugin_migrations__ (id) VALUES (?)',
            [migrationId],
          );
        });

        results.push({ migrationId, status: 'applied' });
      } catch (error) {
        console.error(
          `Plugin ${pluginId} migration ${migrationId} failed:`,
          error,
        );
        results.push({ migrationId, status: 'failed', error: error.message });
        // Stop processing further migrations on failure
        break;
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error(`Plugin ${pluginId} migrations failed:`, error);
    throw error;
  }
};

handlers['plugin-database-get-migrations'] = async function ({ pluginId }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const rows = sqlite.runQuery(
      db,
      'SELECT id FROM __plugin_migrations__ ORDER BY applied_at',
      [],
      true,
    ) as { id: string }[];
    return rows.map(row => row.id);
  } catch (error) {
    console.error(`Plugin ${pluginId} getMigrationState error:`, error);
    throw error;
  }
};

handlers['plugin-database-set-metadata'] = async function ({
  pluginId,
  key,
  value,
}) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const serializedValue = JSON.stringify(value);
    sqlite.runQuery(
      db,
      'INSERT OR REPLACE INTO __plugin_metadata__ (key, value) VALUES (?, ?)',
      [key, serializedValue],
    );
    return { success: true };
  } catch (error) {
    console.error(`Plugin ${pluginId} setMetadata error:`, error);
    throw error;
  }
};

handlers['plugin-database-get-metadata'] = async function ({ pluginId, key }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const row = sqlite.runQuery(
      db,
      'SELECT value FROM __plugin_metadata__ WHERE key = ?',
      [key],
      false,
    ) as unknown as { value: string } | null;
    return row ? JSON.parse(row.value) : null;
  } catch (error) {
    console.error(`Plugin ${pluginId} getMetadata error:`, error);
    throw error;
  }
};

// Plugin schema introspection and AQL support
type PluginSchemaField = {
  type: string;
  required: boolean;
  default?: unknown;
};

type PluginTableSchema = Record<string, PluginSchemaField>;
type PluginSchema = Record<string, PluginTableSchema>;

const pluginSchemas = new Map<string, PluginSchema>();

async function introspectPluginSchema(pluginId: string): Promise<PluginSchema> {
  // Check if we already have the schema cached
  if (pluginSchemas.has(pluginId)) {
    return pluginSchemas.get(pluginId)!;
  }

  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    // Get all tables in the plugin database
    const tables = sqlite.runQuery(
      db,
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__plugin_%'",
      [],
      true,
    ) as { name: string }[];

    const schema: PluginSchema = {};

    // For each table, get its schema
    for (const table of tables) {
      const tableInfo = sqlite.runQuery(
        db,
        `PRAGMA table_info(${table.name})`,
        [],
        true,
      ) as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
      }>;

      const tableSchema: PluginTableSchema = {};

      for (const column of tableInfo) {
        const fieldType = mapSQLiteTypeToAQL(column.type.toUpperCase());
        tableSchema[column.name] = {
          type: fieldType,
          required: column.notnull === 1 && column.dflt_value === null,
          ...(column.dflt_value !== null && { default: column.dflt_value }),
        };
      }

      schema[table.name] = tableSchema;
    }

    // Cache the schema
    pluginSchemas.set(pluginId, schema);
    return schema;
  } catch (error) {
    console.error(`Plugin ${pluginId} schema introspection error:`, error);
    throw error;
  }
}

function mapSQLiteTypeToAQL(sqliteType: string): string {
  // Map SQLite types to AQL field types
  switch (sqliteType) {
    case 'TEXT':
      return 'string';
    case 'INTEGER':
      return 'integer';
    case 'REAL':
    case 'NUMERIC':
      return 'float';
    case 'BOOLEAN':
      return 'boolean';
    case 'DATE':
      return 'date';
    case 'DATETIME':
      return 'string';
    case 'JSON':
      return 'json';
    default:
      // Default to string for unknown types
      return 'string';
  }
}

handlers['plugin-aql-query'] = async function ({
  pluginId,
  query,
  options = {},
}: {
  pluginId: string;
  query: Query;
  options?: {
    target?: string;
    params?: Record<string, string | number | boolean | null>;
  };
}) {
  const { target = 'plugin', params = {} } = options;

  if (target === 'host') {
    // For host queries, use the main database and schema
    return aqlQuery(query.state, { params });
  } else {
    // For plugin queries, use the plugin database and introspected schema
    const db = pluginDatabases.get(pluginId);
    if (!db) {
      throw new Error(`Database not found for plugin: ${pluginId}`);
    }

    try {
      // Normalize the query object to ensure all required properties exist
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

      // Get or create the plugin schema
      const pluginSchema = await introspectPluginSchema(pluginId);

      // Create a custom schema config for the plugin with proper customizeQuery
      const pluginSchemaConfig = {
        tableViews: {},
        tableFilters: () => [],
        customizeQuery: queryState => {
          // Ensure default ordering if none specified
          const orderExpressions =
            queryState.orderExpressions &&
            queryState.orderExpressions.length > 0
              ? queryState.orderExpressions.concat(['id']) // Add id for deterministic sorting
              : ['id']; // Default to id sorting

          return {
            ...queryState,
            orderExpressions,
          };
        },
        views: {},
      };

      // Import the required functions from AQL - using correct paths
      const { compileQuery } = await import('./aql');
      const { defaultConstructQuery } = await import('./aql/compiler');
      const { convertInputType, convertOutputType } = await import(
        './aql/schema-helpers'
      );

      // Compile the query using the plugin schema
      const { sqlPieces, state } = compileQuery(
        normalizedQuery,
        pluginSchema,
        pluginSchemaConfig,
      );

      // Convert parameters to the correct types
      const paramArray = state.namedParameters.map(param => {
        const name = param.paramName;
        if (params[name] === undefined) {
          throw new Error(`Parameter ${name} not provided to query`);
        }
        return convertInputType(params[name], param.paramType);
      });

      // Generate the final SQL
      const sql = defaultConstructQuery(normalizedQuery, state, sqlPieces);

      // Execute directly on the plugin database (same pattern as db/index.ts)
      let data = sqlite.runQuery(db, sql, paramArray, true);

      // Apply output type conversions
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
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

      // Handle calculation queries (single value results)
      if (normalizedQuery.calculation) {
        if (Array.isArray(data) && data.length > 0) {
          const row = data[0];
          const k = Object.keys(row)[0];
          data = row[k] || 0;
        } else {
          data = null;
        }
      }

      return { data, dependencies: state.dependencies } as AQLQueryResult;
    } catch (error) {
      console.error(`Plugin ${pluginId} AQL query error:`, error);
      throw error;
    }
  }
};

handlers = installAPI(handlers) as Handlers;

injectAPI.override((name, args) => runHandler(app.handlers[name], args));

// A hack for now until we clean up everything
app.handlers = handlers;
app.combine(
  authApp,
  schedulesApp,
  budgetApp,
  dashboardApp,
  notesApp,
  preferencesApp,
  toolsApp,
  filtersApp,
  reportsApp,
  rulesApp,
  adminApp,
  transactionsApp,
  accountsApp,
  payeesApp,
  spreadsheetApp,
  syncApp,
  budgetFilesApp,
  encryptionApp,
  tagsApp,
  pluginsApp,
);

export function getDefaultDocumentDir() {
  return fs.join(process.env.ACTUAL_DOCUMENT_DIR, 'Actual');
}

async function setupDocumentsDir() {
  async function ensureExists(dir) {
    // Make sure the document folder exists
    if (!(await fs.exists(dir))) {
      await fs.mkdir(dir);
    }
  }

  let documentDir = await asyncStorage.getItem('document-dir');

  // Test the existing documents directory to make sure it's a valid
  // path that exists, and if it errors fallback to the default one
  if (documentDir) {
    try {
      await ensureExists(documentDir);
    } catch (e) {
      documentDir = null;
    }
  }

  if (!documentDir) {
    documentDir = getDefaultDocumentDir();
  }

  await ensureExists(documentDir);
  fs._setDocumentDir(documentDir);
}

export async function initApp(isDev, socketName) {
  await sqlite.init();
  await Promise.all([asyncStorage.init(), fs.init()]);
  await setupDocumentsDir();

  const keysStr = await asyncStorage.getItem('encrypt-keys');
  if (keysStr) {
    try {
      const keys = JSON.parse(keysStr);

      // Load all the keys
      await Promise.all(
        Object.keys(keys).map(fileId => {
          return encryption.loadKey(keys[fileId]);
        }),
      );
    } catch (e) {
      console.log('Error loading key', e);
      throw new Error('load-key-error');
    }
  }

  const url = await asyncStorage.getItem('server-url');

  if (!url) {
    await asyncStorage.removeItem('user-token');
  }
  setServer(url);

  connection.init(socketName, app.handlers);

  // Allow running DB queries locally
  global.$query = aqlQuery;
  global.$q = q;

  if (isDev) {
    global.$send = (name, args) => runHandler(app.handlers[name], args);
    global.$db = db;
    global.$setSyncingMode = setSyncingMode;
  }
}

export type InitConfig = {
  dataDir?: string;
  serverURL?: string;
  password?: string;
};

export async function init(config: InitConfig) {
  // Get from build

  let dataDir, serverURL;
  if (config) {
    dataDir = config.dataDir;
    serverURL = config.serverURL;
  } else {
    dataDir = process.env.ACTUAL_DATA_DIR;
    serverURL = process.env.ACTUAL_SERVER_URL;
  }

  await sqlite.init();
  await Promise.all([asyncStorage.init({ persist: false }), fs.init()]);
  fs._setDocumentDir(dataDir || process.cwd());

  if (serverURL) {
    setServer(serverURL);

    if (config.password) {
      await runHandler(handlers['subscribe-sign-in'], {
        password: config.password,
      });
    }
  } else {
    // This turns off all server URLs. In this mode we don't want any
    // access to the server, we are doing things locally
    setServer(null);

    app.events.on('load-budget', () => {
      setSyncingMode('offline');
    });
  }

  return lib;
}

// Export a few things required for the platform

export const lib = {
  getDataDir: fs.getDataDir,
  sendMessage: (msg, args) => connection.send(msg, args),
  send: async <K extends keyof Handlers, T extends Handlers[K]>(
    name: K,
    args?: Parameters<T>[0],
  ): Promise<Awaited<ReturnType<T>>> => {
    const res = await runHandler(app.handlers[name], args);
    return res;
  },
  on: (name, func) => app.events.on(name, func),
  q,
  db,
};
