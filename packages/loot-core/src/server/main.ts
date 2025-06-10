// @ts-strict-ignore
import './polyfills';

import * as injectAPI from '@actual-app/api/injected';
import * as CRDT from '@actual-app/crdt';
import { type Database } from '@jlongster/sql.js';
import { v4 as uuidv4 } from 'uuid';

import { createTestBudget } from '../mocks/budget';
import { captureException, captureBreadcrumb } from '../platform/exceptions';
import * as asyncStorage from '../platform/server/asyncStorage';
import * as connection from '../platform/server/connection';
import * as fs from '../platform/server/fs';
import * as idb from '../platform/server/indexeddb';
import { logger } from '../platform/server/log';
import * as sqlite from '../platform/server/sqlite';
import { q } from '../shared/query';
import { type Budget } from '../types/budget';
import { Handlers } from '../types/handlers';
import { ActualPluginStored } from '../types/models/actual-plugin-stored';
import { OpenIdConfig } from '../types/models/openid';

import { app as accountsApp } from './accounts/app';
import { app as adminApp } from './admin/app';
import { installAPI } from './api';
import { runQuery as aqlQuery } from './aql';
import {
  getAvailableBackups,
  loadBackup,
  makeBackup,
  startBackupService,
  stopBackupService,
} from './backups';
import { app as budgetApp } from './budget/app';
import * as budget from './budget/base';
import * as cloudStorage from './cloud-storage';
import { app as dashboardApp } from './dashboard/app';
import * as db from './db';
import * as mappings from './db/mappings';
import * as encryption from './encryption';
import { app as filtersApp } from './filters/app';
import { handleBudgetImport } from './importers';
import { app } from './main-app';
import { mutator, runHandler } from './mutators';
import { app as notesApp } from './notes/app';
import { app as payeesApp } from './payees/app';
import * as Platform from './platform';
import { extractZipToMap } from './plugins/pluginUtil';
import { get, post } from './post';
import { app as preferencesApp } from './preferences/app';
import * as prefs from './prefs';
import { app as reportsApp } from './reports/app';
import { app as rulesApp } from './rules/app';
import { app as schedulesApp } from './schedules/app';
import { getServer, isValidBaseURL, setServer } from './server-config';
import * as sheet from './sheet';
import { app as spreadsheetApp } from './spreadsheet/app';
import {
  initialFullSync,
  fullSync,
  setSyncingMode,
  makeTestMessage,
  clearFullSyncTimeout,
  resetSync,
} from './sync';
import { app as syncApp } from './sync/app';
import * as syncMigrations from './sync/migrate';
import { app as toolsApp } from './tools/app';
import { app as transactionsApp } from './transactions/app';
import * as rules from './transactions/transaction-rules';
import { clearUndo, undo, redo } from './undo';
import { updateVersion } from './update';
import {
  uniqueBudgetName,
  idFromBudgetName,
  validateBudgetName,
} from './util/budget-name';

const DEMO_BUDGET_ID = '_demo-budget';
const TEST_BUDGET_ID = '_test-budget';

// util

function onSheetChange({ names }) {
  const nodes = names.map(name => {
    const node = sheet.get()._getNode(name);
    return { name: node.name, value: node.value };
  });
  connection.send('cells-changed', nodes);
}

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
  if (query.table == null) {
    throw new Error('query has no table, did you forgot to call `.serialize`?');
  }

  return aqlQuery(query);
};

// A user can only enable/change their key with the file loaded. This
// will change in the future: during onboarding the user should be
// able to enable encryption. (Imagine if they are importing data from
// another source, they should be able to encrypt first)
handlers['key-make'] = async function ({ password }) {
  if (!prefs.getPrefs()) {
    throw new Error('user-set-key must be called with file loaded');
  }

  const salt = encryption.randomBytes(32).toString('base64');
  const id = uuidv4();
  const key = await encryption.createKey({ id, password, salt });

  // Load the key
  await encryption.loadKey(key);

  // Make some test data to use if the key is valid or not
  const testContent = await makeTestMessage(key.getId());

  // Changing your key necessitates a sync reset as well. This will
  // clear all existing encrypted data from the server so you won't
  // have a mix of data encrypted with different keys.
  return await resetSync({
    key,
    salt,
    testContent: JSON.stringify({
      ...testContent,
      value: testContent.value.toString('base64'),
    }),
  });
};

// This can be called both while a file is already loaded or not. This
// will see if a key is valid and if so save it off.
handlers['key-test'] = async function ({ fileId, password }) {
  const userToken = await asyncStorage.getItem('user-token');

  if (fileId == null) {
    fileId = prefs.getPrefs().cloudFileId;
  }

  let res;
  try {
    res = await post(getServer().SYNC_SERVER + '/user-get-key', {
      token: userToken,
      fileId,
    });
  } catch (e) {
    console.log(e);
    return { error: { reason: 'network' } };
  }

  const { id, salt, test: originalTest } = res;

  let test = originalTest;
  if (test == null) {
    return { error: { reason: 'old-key-style' } };
  }

  test = JSON.parse(test);

  const key = await encryption.createKey({ id, password, salt });
  encryption.loadKey(key);

  try {
    await encryption.decrypt(Buffer.from(test.value, 'base64'), test.meta);
  } catch (e) {
    console.log(e);

    // Unload the key, it's invalid
    encryption.unloadKey(key);
    return { error: { reason: 'decrypt-failure' } };
  }

  // Persist key in async storage
  const keys = JSON.parse((await asyncStorage.getItem(`encrypt-keys`)) || '{}');
  keys[fileId] = key.serialize();
  await asyncStorage.setItem('encrypt-keys', JSON.stringify(keys));

  // Save the key id in prefs if the are loaded. If they aren't, we
  // are testing a key to download a file and when the file is
  // actually downloaded it will update the prefs with the latest key id
  if (prefs.getPrefs()) {
    await prefs.savePrefs({ encryptKeyId: key.getId() });
  }

  return {};
};

handlers['get-did-bootstrap'] = async function () {
  return Boolean(await asyncStorage.getItem('did-bootstrap'));
};

handlers['subscribe-needs-bootstrap'] = async function ({
  url,
}: { url? } = {}) {
  if (url && !isValidBaseURL(url)) {
    return { error: 'get-server-failure' };
  }

  try {
    if (!getServer(url)) {
      return { bootstrapped: true, hasServer: false };
    }
  } catch (err) {
    return { error: 'get-server-failure' };
  }

  let res;
  try {
    res = await get(getServer(url).SIGNUP_SERVER + '/needs-bootstrap');
  } catch (err) {
    return { error: 'network-failure' };
  }

  try {
    res = JSON.parse(res);
  } catch (err) {
    return { error: 'parse-failure' };
  }

  if (res.status === 'error') {
    return { error: res.reason };
  }

  return {
    bootstrapped: res.data.bootstrapped,
    availableLoginMethods: res.data.availableLoginMethods || [
      { method: 'password', active: true, displayName: 'Password' },
    ],
    multiuser: res.data.multiuser || false,
    hasServer: true,
  };
};

handlers['subscribe-bootstrap'] = async function (loginConfig) {
  try {
    await post(getServer().SIGNUP_SERVER + '/bootstrap', loginConfig);
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }
  return {};
};

handlers['subscribe-get-login-methods'] = async function () {
  let res;
  try {
    res = await fetch(getServer().SIGNUP_SERVER + '/login-methods').then(res =>
      res.json(),
    );
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }

  if (res.methods) {
    return { methods: res.methods };
  }
  return { error: 'internal' };
};

handlers['subscribe-get-user'] = async function () {
  if (!getServer()) {
    if (!(await asyncStorage.getItem('did-bootstrap'))) {
      return null;
    }
    return { offline: false };
  }

  const userToken = await asyncStorage.getItem('user-token');

  if (!userToken) {
    return null;
  }

  try {
    const res = await get(getServer().SIGNUP_SERVER + '/validate', {
      headers: {
        'X-ACTUAL-TOKEN': userToken,
      },
    });
    let tokenExpired = false;
    const {
      status,
      reason,
      data: {
        userName = null,
        permission = '',
        userId = null,
        displayName = null,
        loginMethod = null,
      } = {},
    } = JSON.parse(res) || {};

    if (status === 'error') {
      if (reason === 'unauthorized') {
        return null;
      } else if (reason === 'token-expired') {
        tokenExpired = true;
      } else {
        return { offline: true };
      }
    }

    return {
      offline: false,
      userName,
      permission,
      userId,
      displayName,
      loginMethod,
      tokenExpired,
    };
  } catch (e) {
    console.log(e);
    return { offline: true };
  }
};

handlers['subscribe-change-password'] = async function ({ password }) {
  const userToken = await asyncStorage.getItem('user-token');
  if (!userToken) {
    return { error: 'not-logged-in' };
  }

  try {
    await post(getServer().SIGNUP_SERVER + '/change-password', {
      token: userToken,
      password,
    });
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }

  return {};
};

handlers['subscribe-sign-in'] = async function (loginInfo) {
  if (
    typeof loginInfo.loginMethod !== 'string' ||
    loginInfo.loginMethod == null
  ) {
    loginInfo.loginMethod = 'password';
  }
  let res;

  try {
    res = await post(getServer().SIGNUP_SERVER + '/login', loginInfo);
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }

  if (res.redirect_url) {
    return { redirect_url: res.redirect_url };
  }

  if (!res.token) {
    throw new Error('login: User token not set');
  }

  await asyncStorage.setItem('user-token', res.token);
  return {};
};

handlers['subscribe-sign-out'] = async function () {
  encryption.unloadAllKeys();
  await asyncStorage.multiRemove([
    'user-token',
    'encrypt-keys',
    'lastBudget',
    'readOnly',
  ]);
  return 'ok';
};

handlers['subscribe-set-token'] = async function ({ token }) {
  await asyncStorage.setItem('user-token', token);
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

handlers['validate-budget-name'] = async function ({ name }) {
  return validateBudgetName(name);
};

handlers['unique-budget-name'] = async function ({ name }) {
  return uniqueBudgetName(name);
};

handlers['get-budgets'] = async function () {
  const paths = await fs.listDir(fs.getDocumentDir());
  const budgets = (
    await Promise.all(
      paths.map(async name => {
        const prefsPath = fs.join(fs.getDocumentDir(), name, 'metadata.json');
        if (await fs.exists(prefsPath)) {
          let prefs;
          try {
            prefs = JSON.parse(await fs.readFile(prefsPath));
          } catch (e) {
            console.log('Error parsing metadata:', e.stack);
            return;
          }

          // We treat the directory name as the canonical id so that if
          // the user moves it around/renames/etc, nothing breaks. The
          // id is stored in prefs just for convenience (and the prefs
          // will always update to the latest given id)
          if (name !== DEMO_BUDGET_ID) {
            return {
              id: name,
              ...(prefs.cloudFileId ? { cloudFileId: prefs.cloudFileId } : {}),
              ...(prefs.encryptKeyId
                ? { encryptKeyId: prefs.encryptKeyId }
                : {}),
              ...(prefs.groupId ? { groupId: prefs.groupId } : {}),
              ...(prefs.owner ? { owner: prefs.owner } : {}),
              name: prefs.budgetName || '(no name)',
            } satisfies Budget;
          }
        }

        return null;
      }),
    )
  ).filter(x => x);

  return budgets;
};

handlers['get-remote-files'] = async function () {
  return cloudStorage.listRemoteFiles();
};

handlers['get-user-file-info'] = async function (fileId: string) {
  return cloudStorage.getRemoteFile(fileId);
};

handlers['reset-budget-cache'] = mutator(async function () {
  // Recomputing everything will update the cache
  await sheet.loadUserBudgets(db);
  sheet.get().recomputeAll();
  await sheet.waitOnSpreadsheet();
});

handlers['upload-budget'] = async function ({ id }: { id? } = {}) {
  if (id) {
    if (prefs.getPrefs()) {
      throw new Error('upload-budget: id given but prefs already loaded');
    }

    await prefs.loadPrefs(id);
  }

  try {
    await cloudStorage.upload();
  } catch (e) {
    console.log(e);
    if (e.type === 'FileUploadError') {
      return { error: e };
    }
    captureException(e);
    return { error: { reason: 'internal' } };
  } finally {
    if (id) {
      prefs.unloadPrefs();
    }
  }

  return {};
};

handlers['download-budget'] = async function ({ fileId }) {
  let result;
  try {
    result = await cloudStorage.download(fileId);
  } catch (e) {
    if (e.type === 'FileDownloadError') {
      if (e.reason === 'file-exists' && e.meta.id) {
        await prefs.loadPrefs(e.meta.id);
        const name = prefs.getPrefs().budgetName;
        prefs.unloadPrefs();

        e.meta = { ...e.meta, name };
      }

      return { error: e };
    } else {
      captureException(e);
      return { error: { reason: 'internal' } };
    }
  }

  const id = result.id;
  await handlers['load-budget']({ id });
  result = await handlers['sync-budget']();

  if (result.error) {
    return result;
  }
  return { id };
};

// open and sync, but don't close
handlers['sync-budget'] = async function () {
  setSyncingMode('enabled');
  const result = await initialFullSync();

  return result;
};

handlers['load-budget'] = async function ({ id }) {
  const currentPrefs = prefs.getPrefs();

  if (currentPrefs) {
    if (currentPrefs.id === id) {
      // If it's already loaded, do nothing
      return {};
    } else {
      // Otherwise, close the currently loaded budget
      await handlers['close-budget']();
    }
  }

  const res = await loadBudget(id);

  return res;
};

handlers['create-demo-budget'] = async function () {
  // Make sure the read only flag isn't leftover (normally it's
  // reset when signing in, but you don't have to sign in for the
  // demo budget)
  await asyncStorage.setItem('readOnly', '');

  return handlers['create-budget']({
    budgetName: 'Demo Budget',
    testMode: true,
    testBudgetId: DEMO_BUDGET_ID,
  });
};

handlers['close-budget'] = async function () {
  captureBreadcrumb({ message: 'Closing budget' });

  // The spreadsheet may be running, wait for it to complete
  await sheet.waitOnSpreadsheet();
  sheet.unloadSpreadsheet();

  clearFullSyncTimeout();
  await app.stopServices();

  await db.closeDatabase();

  try {
    await asyncStorage.setItem('lastBudget', '');
  } catch (e) {
    // This might fail if we are shutting down after failing to load a
    // budget. We want to unload whatever has already been loaded but
    // be resilient to anything failing
  }

  prefs.unloadPrefs();
  await stopBackupService();
  return 'ok';
};

handlers['delete-budget'] = async function ({ id, cloudFileId }) {
  // If it's a cloud file, you can delete it from the server by
  // passing its cloud id
  if (cloudFileId) {
    await cloudStorage.removeFile(cloudFileId).catch(() => {});
  }

  // If a local file exists, you can delete it by passing its local id
  if (id) {
    // opening and then closing the database is a hack to be able to delete
    // the budget file if it hasn't been opened yet.  This needs a better
    // way, but works for now.
    try {
      await db.openDatabase(id);
      await db.closeDatabase();
      const budgetDir = fs.getBudgetDir(id);
      await fs.removeDirRecursively(budgetDir);
    } catch (e) {
      return 'fail';
    }
  }

  return 'ok';
};

handlers['duplicate-budget'] = async function ({
  id,
  newName,
  cloudSync,
  open,
}): Promise<string> {
  if (!id) throw new Error('Unable to duplicate a budget that is not local.');

  const { valid, message } = await validateBudgetName(newName);
  if (!valid) throw new Error(message);

  const budgetDir = fs.getBudgetDir(id);

  const newId = await idFromBudgetName(newName);

  // copy metadata from current budget
  // replace id with new budget id and budgetName with new budget name
  const metadataText = await fs.readFile(fs.join(budgetDir, 'metadata.json'));
  const metadata = JSON.parse(metadataText);
  metadata.id = newId;
  metadata.budgetName = newName;
  [
    'cloudFileId',
    'groupId',
    'lastUploaded',
    'encryptKeyId',
    'lastSyncedTimestamp',
  ].forEach(item => {
    if (metadata[item]) delete metadata[item];
  });

  try {
    const newBudgetDir = fs.getBudgetDir(newId);
    await fs.mkdir(newBudgetDir);

    // write metadata for new budget
    await fs.writeFile(
      fs.join(newBudgetDir, 'metadata.json'),
      JSON.stringify(metadata),
    );

    await fs.copyFile(
      fs.join(budgetDir, 'db.sqlite'),
      fs.join(newBudgetDir, 'db.sqlite'),
    );
  } catch (error) {
    // Clean up any partially created files
    try {
      const newBudgetDir = fs.getBudgetDir(newId);
      if (await fs.exists(newBudgetDir)) {
        await fs.removeDirRecursively(newBudgetDir);
      }
    } catch {} // Ignore cleanup errors
    throw new Error(`Failed to duplicate budget file: ${error.message}`);
  }

  // load in and validate
  const { error } = await loadBudget(newId);
  if (error) {
    console.log('Error duplicating budget: ' + error);
    return error;
  }

  if (cloudSync) {
    try {
      await cloudStorage.upload();
    } catch (error) {
      console.warn('Failed to sync duplicated budget to cloud:', error);
      // Ignore any errors uploading. If they are offline they should
      // still be able to create files.
    }
  }

  handlers['close-budget']();
  if (open === 'original') await loadBudget(id);
  if (open === 'copy') await loadBudget(newId);

  return newId;
};

handlers['create-budget'] = async function ({
  budgetName,
  avoidUpload,
  testMode,
  testBudgetId,
}: {
  budgetName?;
  avoidUpload?;
  testMode?;
  testBudgetId?;
} = {}) {
  let id;
  if (testMode) {
    budgetName = budgetName || 'Test Budget';
    id = testBudgetId || TEST_BUDGET_ID;

    if (await fs.exists(fs.getBudgetDir(id))) {
      await fs.removeDirRecursively(fs.getBudgetDir(id));
    }
  } else {
    // Generate budget name if not given
    if (!budgetName) {
      budgetName = await uniqueBudgetName();
    }

    id = await idFromBudgetName(budgetName);
  }

  const budgetDir = fs.getBudgetDir(id);
  await fs.mkdir(budgetDir);

  // Create the initial database
  await fs.copyFile(fs.bundledDatabasePath, fs.join(budgetDir, 'db.sqlite'));

  // Create the initial prefs file
  await fs.writeFile(
    fs.join(budgetDir, 'metadata.json'),
    JSON.stringify(prefs.getDefaultPrefs(id, budgetName)),
  );

  // Load it in
  const { error } = await loadBudget(id);
  if (error) {
    console.log('Error creating budget: ' + error);
    return { error };
  }

  if (!avoidUpload && !testMode) {
    try {
      await cloudStorage.upload();
    } catch (e) {
      // Ignore any errors uploading. If they are offline they should
      // still be able to create files.
    }
  }

  if (testMode) {
    await createTestBudget(handlers);
  }

  return {};
};

handlers['import-budget'] = async function ({ filepath, type }) {
  try {
    if (!(await fs.exists(filepath))) {
      throw new Error(`File not found at the provided path: ${filepath}`);
    }

    const buffer = Buffer.from(await fs.readFile(filepath, 'binary'));
    const results = await handleBudgetImport(type, filepath, buffer);
    return results || {};
  } catch (err) {
    err.message = 'Error importing budget: ' + err.message;
    captureException(err);
    return { error: 'internal-error' };
  }
};

handlers['export-budget'] = async function () {
  try {
    return {
      data: await cloudStorage.exportBuffer(),
    };
  } catch (err) {
    err.message = 'Error exporting budget: ' + err.message;
    captureException(err);
    return { error: 'internal-error' };
  }
};

handlers['enable-openid'] = async function (loginConfig) {
  try {
    const userToken = await asyncStorage.getItem('user-token');

    if (!userToken) {
      return { error: 'unauthorized' };
    }

    await post(getServer().BASE_SERVER + '/openid/enable', loginConfig, {
      'X-ACTUAL-TOKEN': userToken,
    });
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }
  return {};
};

handlers['enable-password'] = async function (loginConfig) {
  try {
    const userToken = await asyncStorage.getItem('user-token');

    if (!userToken) {
      return { error: 'unauthorized' };
    }

    await post(getServer().BASE_SERVER + '/openid/disable', loginConfig, {
      'X-ACTUAL-TOKEN': userToken,
    });
  } catch (err) {
    return { error: err.reason || 'network-failure' };
  }
  return {};
};

handlers['get-openid-config'] = async function () {
  try {
    const res = await get(getServer().BASE_SERVER + '/openid/config');

    if (res) {
      const config = JSON.parse(res) as OpenIdConfig;
      return { openId: config };
    }

    return null;
  } catch (err) {
    return { error: 'config-fetch-failed' };
  }
};

async function loadBudget(id: string) {
  let dir: string;
  try {
    dir = fs.getBudgetDir(id);
  } catch (e) {
    captureException(
      new Error('`getBudgetDir` failed in `loadBudget`: ' + e.message),
    );
    return { error: 'budget-not-found' };
  }

  captureBreadcrumb({ message: 'Loading budget ' + dir });

  if (!(await fs.exists(dir))) {
    captureException(new Error('budget directory does not exist'));
    return { error: 'budget-not-found' };
  }

  try {
    await prefs.loadPrefs(id);
    await db.openDatabase(id);
  } catch (e) {
    captureBreadcrumb({ message: 'Error loading budget ' + id });
    captureException(e);
    await handlers['close-budget']();
    return { error: 'opening-budget' };
  }

  // Older versions didn't tag the file with the current user, so do
  // so now
  if (!prefs.getPrefs().userId) {
    const userId = await asyncStorage.getItem('user-token');
    prefs.savePrefs({ userId });
  }

  try {
    await updateVersion();
  } catch (e) {
    console.warn('Error updating', e);
    let result;
    if (e.message.includes('out-of-sync-migrations')) {
      result = { error: 'out-of-sync-migrations' };
    } else if (e.message.includes('out-of-sync-data')) {
      result = { error: 'out-of-sync-data' };
    } else {
      captureException(e);
      logger.info('Error updating budget ' + id, e);
      console.log('Error updating budget', e);
      result = { error: 'loading-budget' };
    }

    await handlers['close-budget']();
    return result;
  }

  await db.loadClock();

  if (prefs.getPrefs().resetClock) {
    // If we need to generate a fresh clock, we need to generate a new
    // client id. This happens when the database is transferred to a
    // new device.
    //
    // TODO: The client id should be stored elsewhere. It shouldn't
    // work this way, but it's fine for now.
    CRDT.getClock().timestamp.setNode(CRDT.makeClientId());
    await db.runQuery(
      'INSERT OR REPLACE INTO messages_clock (id, clock) VALUES (1, ?)',
      [CRDT.serializeClock(CRDT.getClock())],
    );

    await prefs.savePrefs({ resetClock: false });
  }

  if (
    !Platform.isWeb &&
    !Platform.isMobile &&
    process.env.NODE_ENV !== 'test'
  ) {
    await startBackupService(id);
  }

  try {
    await sheet.loadSpreadsheet(db, onSheetChange);
  } catch (e) {
    captureException(e);
    await handlers['close-budget']();
    return { error: 'opening-budget' };
  }

  // This is a bit leaky, but we need to set the initial budget type
  const { value: budgetType = 'rollover' } =
    (await db.first<Pick<db.DbPreference, 'value'>>(
      'SELECT value from preferences WHERE id = ?',
      ['budgetType'],
    )) ?? {};
  sheet.get().meta().budgetType = budgetType;
  await budget.createAllBudgets();

  // Load all the in-memory state
  await mappings.loadMappings();
  await rules.loadRules();
  await syncMigrations.listen();
  await app.startServices();

  clearUndo();

  // Ensure that syncing is enabled
  if (process.env.NODE_ENV !== 'test') {
    if (id === DEMO_BUDGET_ID) {
      setSyncingMode('disabled');
    } else {
      if (getServer()) {
        setSyncingMode('enabled');
      } else {
        setSyncingMode('disabled');
      }

      await asyncStorage.setItem('lastBudget', id);

      // Only upload periodically on desktop
      if (!Platform.isMobile) {
        await cloudStorage.possiblyUpload();
      }
    }
  }

  app.events.emit('load-budget', { id });

  return {};
}

handlers['upload-file-web'] = async function ({ filename, contents }) {
  if (!Platform.isWeb) {
    return null;
  }

  await fs.writeFile('/uploads/' + filename, contents);
  return {};
};

handlers['backups-get'] = async function ({ id }) {
  return getAvailableBackups(id);
};

handlers['backup-load'] = async function ({ id, backupId }) {
  await loadBackup(id, backupId);
};

handlers['backup-make'] = async function ({ id }) {
  await makeBackup(id);
};

handlers['get-last-opened-backup'] = async function () {
  const id = await asyncStorage.getItem('lastBudget');
  if (id && id !== '') {
    const budgetDir = fs.getBudgetDir(id);

    // We never want to give back a budget that does not exist on the
    // filesystem anymore, so first check that it exists
    if (await fs.exists(budgetDir)) {
      return id;
    }
  }
  return null;
};

handlers['app-focused'] = async function () {
  if (prefs.getPrefs() && prefs.getPrefs().id) {
    // First we sync
    fullSync();
  }
};

handlers['plugin-files'] = async function ({ pluginUrl }) {
  const { store } = idb.getStore(await idb.getDatabase(), 'plugins');
  const item: ActualPluginStored = await idb.get(
    store,
    decodeURIComponent(pluginUrl),
  );

  if (item == null) {
    throw new Error('Plugin does not exist: ' + decodeURIComponent(pluginUrl));
  }

  const filesMap = await extractZipToMap(item.plugin);

  return [...filesMap.entries()].map(keyValue => ({
    name: keyValue[0].toString(),
    content: keyValue[1].toString(),
  }));
};

// Plugin database management
const pluginDatabases = new Map<string, Database>();

handlers['plugin-create-database'] = async function ({ pluginId }) {
  // Check if database already exists
  if (pluginDatabases.has(pluginId)) {
    return { success: true };
  }

  try {
    // Use the documents directory pattern that Actual Budget uses for databases
    // This automatically handles IndexedDB storage and symlinks to blocked filesystem
    const dbPath = `/documents/plugin-${pluginId}.sqlite`;
    
    // Open/create the database using existing SQLite infrastructure
    // This will automatically create the proper database file with correct structure
    const db = await sqlite.openDatabase(dbPath);

    // Initialize plugin infrastructure tables
    await sqlite.execQuery(db, `
      CREATE TABLE IF NOT EXISTS __plugin_migrations__ (
        id TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS __plugin_metadata__ (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Store database reference
    pluginDatabases.set(pluginId, db);
    
    console.log(`✅ Plugin database created for: ${pluginId} at ${dbPath}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to create plugin database for ${pluginId}:`, error);
    throw error;
  }
};

handlers['plugin-database-query'] = async function ({ pluginId, sql, params = [], fetchAll = false }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    if (fetchAll) {
      return sqlite.runQuery(db, sql, params, true);
    } else {
      return sqlite.runQuery(db, sql, params, false);
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

handlers['plugin-database-transaction'] = async function ({ pluginId, operations }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    return sqlite.transaction(db, () => {
      const results = [];
      for (const op of operations) {
        if (op.type === 'exec') {
          sqlite.execQuery(db, op.sql);
          results.push({ success: true });
        } else if (op.type === 'query') {
          if (op.fetchAll) {
            const result = sqlite.runQuery(db, op.sql, op.params || [], true);
            results.push(result);
          } else {
            const result = sqlite.runQuery(db, op.sql, op.params || [], false);
            results.push(result);
          }
        }
      }
      return results;
    });
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
      true
    ) as { id: string }[];
    const appliedIds = new Set(appliedMigrations.map(row => row.id));

    const results = [];
    
    // Sort migrations by timestamp to ensure proper order
    const sortedMigrations = migrations.sort((a, b) => a[0] - b[0]);
    
    for (const migration of sortedMigrations) {
      const [timestamp, name, upCommand, downCommand] = migration;
      const migrationId = `${timestamp}_${name}`;
      
      if (appliedIds.has(migrationId)) {
        console.log(`Plugin ${pluginId}: Migration ${migrationId} already applied`);
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
            [migrationId]
          );
        });
        
        console.log(`Plugin ${pluginId}: Applied migration ${migrationId}`);
        results.push({ migrationId, status: 'applied' });
      } catch (error) {
        console.error(`Plugin ${pluginId} migration ${migrationId} failed:`, error);
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
      true
    ) as { id: string }[];
    return rows.map(row => row.id);
  } catch (error) {
    console.error(`Plugin ${pluginId} getMigrationState error:`, error);
    throw error;
  }
};

handlers['plugin-database-set-metadata'] = async function ({ pluginId, key, value }) {
  const db = pluginDatabases.get(pluginId);
  if (!db) {
    throw new Error(`Database not found for plugin: ${pluginId}`);
  }

  try {
    const serializedValue = JSON.stringify(value);
    sqlite.runQuery(
      db,
      'INSERT OR REPLACE INTO __plugin_metadata__ (key, value) VALUES (?, ?)',
      [key, serializedValue]
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
      false
    ) as unknown as { value: string } | null;
    return row ? JSON.parse(row.value) : null;
  } catch (error) {
    console.error(`Plugin ${pluginId} getMetadata error:`, error);
    throw error;
  }
};

// Plugin schema introspection and AQL support
const pluginSchemas = new Map<string, any>();

async function introspectPluginSchema(pluginId: string): Promise<any> {
  // Check if we already have the schema cached
  if (pluginSchemas.has(pluginId)) {
    return pluginSchemas.get(pluginId);
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
      true
    ) as { name: string }[];

    const schema = {};

    // For each table, get its schema
    for (const table of tables) {
      const tableInfo = sqlite.runQuery(
        db,
        `PRAGMA table_info(${table.name})`,
        [],
        true
      ) as Array<{
        cid: number;
        name: string;
        type: string;
        notnull: number;
        dflt_value: any;
        pk: number;
      }>;

      const tableSchema = {};
      
      for (const column of tableInfo) {
        const fieldType = mapSQLiteTypeToAQL(column.type.toUpperCase());
        tableSchema[column.name] = {
          type: fieldType,
          required: column.notnull === 1 && column.dflt_value === null,
          ...(column.dflt_value !== null && { default: column.dflt_value })
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

handlers['plugin-aql-query'] = async function ({ pluginId, query, options = {} }) {
  const { target = 'plugin', params = {} } = options;

  if (target === 'host') {
    // For host queries, use the main database and schema
    return aqlQuery(query._lootCorequery._lootCoreQuery.state, { params });
  } else {
    // For plugin queries, use the plugin database and introspected schema
    const db = pluginDatabases.get(pluginId);
    if (!db) {
      throw new Error(`Database not found for plugin: ${pluginId}`);
    }

    try {
      // Normalize the query object to ensure all required properties exist
      const normalizedQuery = {
        table: query._lootCoreQuery.state.table,
        tableOptions: query._lootCoreQuery.state.tableOptions || {},
        filterExpressions: query._lootCoreQuery.state.filterExpressions || query._lootCoreQuery.state.filter ? [query._lootCoreQuery.state.filter] : [],
        selectExpressions: query._lootCoreQuery.state.selectExpressions || query._lootCoreQuery.state.select || ['*'],
        groupExpressions: query._lootCoreQuery.state.groupExpressions || query._lootCoreQuery.state.groupBy || [],
        orderExpressions: query._lootCoreQuery.state.orderExpressions || query._lootCoreQuery.state.orderBy || [],
        calculation: query._lootCoreQuery.state.calculation || false,
        rawMode: query._lootCoreQuery.state.rawMode || false,
        withDead: query._lootCoreQuery.state.withDead || false,
        validateRefs: query._lootCoreQuery.state.validateRefs !== false,
        limit: query._lootCoreQuery.state.limit || null,
        offset: query._lootCoreQuery.state.offset || null
      };

      // Get or create the plugin schema
      const pluginSchema = await introspectPluginSchema(pluginId);
      
      // Create a custom schema config for the plugin with proper customizeQuery
      const pluginSchemaConfig = {
        tableViews: {},
        tableFilters: () => [],
        customizeQuery: (queryState) => {
          // Ensure default ordering if none specified
          const orderExpressions = queryState.orderExpressions && queryState.orderExpressions.length > 0
            ? queryState.orderExpressions.concat(['id']) // Add id for deterministic sorting
            : ['id']; // Default to id sorting

          return {
            ...queryState,
            orderExpressions
          };
        },
        views: {}
      };

      // Import the required functions from AQL - using correct paths
      const { compileQuery } = await import('./aql');
      const { defaultConstructQuery } = await import('./aql/compiler');
      const { convertInputType, convertOutputType } = await import('./aql/schema-helpers');
      
      // Compile the query using the plugin schema
      const { sqlPieces, state } = compileQuery(normalizedQuery, pluginSchema, pluginSchemaConfig);
      
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
              item[name] = convertOutputType(item[name], state.outputTypes.get(name));
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

      return { data, dependencies: state.dependencies };
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
);

export function getDefaultDocumentDir() {
  if (Platform.isMobile) {
    // On mobile, unfortunately we need to be backwards compatible
    // with the old folder structure which does not store files inside
    // of an `Actual` directory. In the future, if we really care, we
    // can migrate them, but for now just return the documents dir
    return process.env.ACTUAL_DOCUMENT_DIR;
  }
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
