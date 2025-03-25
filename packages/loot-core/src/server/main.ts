// @ts-strict-ignore
import './polyfills';

import * as injectAPI from '@actual-app/api/injected';
import * as CRDT from '@actual-app/crdt';
import { PGlite } from '@electric-sql/pglite';
import { v4 as uuidv4 } from 'uuid';

import * as asyncStorage from '../platform/server/asyncStorage';
import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import { logger, setVerboseMode } from '../platform/server/log';
import * as pglite from '../platform/server/pglite';
import * as sqlite from '../platform/server/sqlite';
import { q } from '../shared/query';
import { amountToInteger, integerToAmount } from '../shared/util';
import { type Handlers } from '../types/handlers';

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
  } catch {
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
    } catch {
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

  const db = await pglite.openDatabase();

  // This should only be called on initial creation of database.
  // await db.exec(
  //     `-- __migrations__ definition
  // CREATE TABLE __migrations__ (
  //   id BIGINT PRIMARY KEY NOT NULL
  // );

  // -- accounts definition
  // CREATE TABLE accounts (
  //   id VARCHAR(36) PRIMARY KEY,
  //   account_id VARCHAR(36),
  //   name TEXT,
  //   balance_current BIGINT,
  //   balance_available BIGINT,
  //   balance_limit BIGINT,
  //   mask TEXT,
  //   official_name TEXT,
  //   type TEXT,
  //   subtype TEXT,
  //   bank TEXT,
  //   offbudget BOOLEAN DEFAULT FALSE,
  //   closed BOOLEAN DEFAULT FALSE,
  //   tombstone BOOLEAN DEFAULT FALSE
  // );

  // -- banks definition
  // CREATE TABLE banks (
  //   id VARCHAR(36) PRIMARY KEY,
  //   bank_id TEXT,
  //   name TEXT,
  //   tombstone BOOLEAN DEFAULT FALSE
  // );

  // -- categories definition
  // CREATE TABLE categories (
  //   id VARCHAR(36) PRIMARY KEY,
  //   name TEXT,
  //   is_income BOOLEAN DEFAULT FALSE,
  //   cat_group VARCHAR(36),
  //   sort_order BIGINT,
  //   tombstone BOOLEAN DEFAULT FALSE
  // );

  // -- category_groups definition
  // CREATE TABLE category_groups (
  //   id VARCHAR(36) PRIMARY KEY,
  //   name TEXT UNIQUE,
  //   is_income BOOLEAN DEFAULT FALSE,
  //   sort_order BIGINT,
  //   tombstone BOOLEAN DEFAULT FALSE
  // );

  // -- category_mapping definition
  // CREATE TABLE category_mapping (
  //   id VARCHAR(36) PRIMARY KEY,
  //   transferId VARCHAR(36)
  // );

  // -- created_budgets definition
  // CREATE TABLE created_budgets (
  //   month TEXT PRIMARY KEY
  // );

  // -- db_version definition
  // CREATE TABLE db_version (
  //   version TEXT PRIMARY KEY
  // );

  // -- messages_clock definition
  // CREATE TABLE messages_clock (
  //   id BIGINT PRIMARY KEY,
  //   clock TEXT
  // );

  // -- messages_crdt definition
  // CREATE TABLE messages_crdt (
  //   id BIGINT PRIMARY KEY,
  //   timestamp BIGINT NOT NULL UNIQUE,
  //   dataset TEXT NOT NULL,
  //   row TEXT NOT NULL,
  //   "column" TEXT NOT NULL,
  //   value BYTEA NOT NULL
  // );

  // -- spreadsheet_cells definition
  // CREATE TABLE spreadsheet_cells (
  //   name TEXT PRIMARY KEY,
  //   expr TEXT,
  //   cachedValue TEXT
  // );

  // -- transactions definition
  // CREATE TABLE transactions (
  //   id VARCHAR(36) PRIMARY KEY,
  //   isParent BOOLEAN DEFAULT FALSE,
  //   isChild BOOLEAN DEFAULT FALSE,
  //   acct VARCHAR(36),
  //   category VARCHAR(36),
  //   amount BIGINT,
  //   description TEXT,
  //   notes TEXT,
  //   date DATE, -- INTEGER in sqlite
  //   financial_id TEXT,
  //   type TEXT,
  //   location TEXT,
  //   error TEXT,
  //   imported_description TEXT,
  //   starting_balance_flag BOOLEAN DEFAULT FALSE,
  //   transferred_id VARCHAR(36),
  //   sort_order BIGINT,  -- Using BIGINT to support large sort numbers
  //   tombstone BOOLEAN DEFAULT FALSE
  // );

  // -- pending_transactions definition
  // CREATE TABLE pending_transactions (
  //   id VARCHAR(36) PRIMARY KEY,
  //   acct VARCHAR(36),
  //   amount BIGINT,
  //   description TEXT,
  //   date DATE, -- INTEGER in sqlite
  //   FOREIGN KEY(acct) REFERENCES accounts(id)
  // );
  //   `,
  //   );

  const results1 = await pglite.runQuery(
    db,
    `SELECT schemaname, viewname, definition
FROM pg_views
WHERE definition ILIKE '%v_transactions%';
`,
    [],
    true,
  );
  console.log('PGlite dependencies:', JSON.stringify(results1));

  const results = await pglite.runQuery(
    db,
    `SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
`,
    [],
    true,
  );
  console.log('PGlite columns:', JSON.stringify(results));

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
      logger.log('Error loading key', e);
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
  verbose?: boolean;
};

export async function init(config: InitConfig) {
  // Get from build

  let dataDir, serverURL;
  if (config) {
    dataDir = config.dataDir;
    serverURL = config.serverURL;

    // Set verbose mode if specified
    if (config.verbose !== undefined) {
      setVerboseMode(config.verbose);
    }
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
      const result = await runHandler(handlers['subscribe-sign-in'], {
        password: config.password,
      });
      if (result?.error) {
        throw new Error(`Authentication failed: ${result.error}`);
      }
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
  amountToInteger,
  integerToAmount,
};
