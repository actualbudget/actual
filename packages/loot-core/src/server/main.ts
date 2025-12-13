// @ts-strict-ignore
import './polyfills';

import * as injectAPI from '@actual-app/api/injected';

import * as asyncStorage from '../platform/server/asyncStorage';
import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import { logger, setVerboseMode } from '../platform/server/log';
import * as sqlite from '../platform/server/sqlite';
import { q } from '../shared/query';
import { amountToInteger, integerToAmount } from '../shared/util';
import { Handlers } from '../types/handlers';

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
