// @ts-strict-ignore
import * as CRDT from '@actual-app/crdt';

import { createTestBudget } from '../../mocks/budget';
import { captureException, captureBreadcrumb } from '../../platform/exceptions';
import * as asyncStorage from '../../platform/server/asyncStorage';
import * as connection from '../../platform/server/connection';
import * as fs from '../../platform/server/fs';
import { logger } from '../../platform/server/log';
import * as Platform from '../../shared/platform';
import { Budget } from '../../types/budget';
import { createApp } from '../app';
import * as budget from '../budget/base';
import * as cloudStorage from '../cloud-storage';
import * as db from '../db';
import * as mappings from '../db/mappings';
import { handleBudgetImport, ImportableBudgetType } from '../importers';
import { app as mainApp } from '../main-app';
import { mutator } from '../mutators';
import * as prefs from '../prefs';
import { getServer } from '../server-config';
import * as sheet from '../sheet';
import { setSyncingMode, initialFullSync, clearFullSyncTimeout } from '../sync';
import * as syncMigrations from '../sync/migrate';
import * as rules from '../transactions/transaction-rules';
import { clearUndo } from '../undo';
import { updateVersion } from '../update';
import {
  idFromBudgetName,
  uniqueBudgetName,
  validateBudgetName,
} from '../util/budget-name';

import {
  getAvailableBackups,
  makeBackup as _makeBackup,
  loadBackup as _loadBackup,
  startBackupService,
  stopBackupService,
} from './backups';

const DEMO_BUDGET_ID = '_demo-budget';
const TEST_BUDGET_ID = '_test-budget';

export type BudgetFileHandlers = {
  'validate-budget-name': typeof handleValidateBudgetName;
  'unique-budget-name': typeof handleUniqueBudgetName;
  'get-budgets': typeof getBudgets;
  'get-remote-files': typeof getRemoteFiles;
  'get-user-file-info': typeof getUserFileInfo;
  'reset-budget-cache': typeof resetBudgetCache;
  'upload-budget': typeof uploadBudget;
  'download-budget': typeof downloadBudget;
  'sync-budget': typeof syncBudget;
  'load-budget': typeof loadBudget;
  'create-demo-budget': typeof createDemoBudget;
  'close-budget': typeof closeBudget;
  'delete-budget': typeof deleteBudget;
  'duplicate-budget': typeof duplicateBudget;
  'create-budget': typeof createBudget;
  'import-budget': typeof importBudget;
  'export-budget': typeof exportBudget;
  'upload-file-web': typeof uploadFileWeb;
  'backups-get': typeof getBackups;
  'backup-load': typeof loadBackup;
  'backup-make': typeof makeBackup;
  'get-last-opened-backup': typeof getLastOpenedBackup;
};

export const app = createApp<BudgetFileHandlers>();
app.method('validate-budget-name', handleValidateBudgetName);
app.method('unique-budget-name', handleUniqueBudgetName);
app.method('get-budgets', getBudgets);
app.method('get-remote-files', getRemoteFiles);
app.method('get-user-file-info', getUserFileInfo);
app.method('reset-budget-cache', mutator(resetBudgetCache));
app.method('upload-budget', uploadBudget);
app.method('download-budget', downloadBudget);
app.method('sync-budget', syncBudget);
app.method('load-budget', loadBudget);
app.method('create-demo-budget', createDemoBudget);
app.method('close-budget', closeBudget);
app.method('delete-budget', deleteBudget);
app.method('duplicate-budget', duplicateBudget);
app.method('create-budget', createBudget);
app.method('import-budget', importBudget);
app.method('export-budget', exportBudget);
app.method('upload-file-web', uploadFileWeb);
app.method('backups-get', getBackups);
app.method('backup-load', loadBackup);
app.method('backup-make', makeBackup);
app.method('get-last-opened-backup', getLastOpenedBackup);

async function handleValidateBudgetName({ name }: { name: string }) {
  return validateBudgetName(name);
}

async function handleUniqueBudgetName({ name }: { name: string }) {
  return uniqueBudgetName(name);
}

async function getBudgets() {
  const paths = await fs.listDir(fs.getDocumentDir());
  const budgets: (Budget | null)[] = await Promise.all(
    paths.map(async name => {
      const prefsPath = fs.join(fs.getDocumentDir(), name, 'metadata.json');
      if (await fs.exists(prefsPath)) {
        let prefs;
        try {
          prefs = JSON.parse(await fs.readFile(prefsPath));
        } catch (e) {
          console.log('Error parsing metadata:', e.stack);
          return null;
        }

        // We treat the directory name as the canonical id so that if
        // the user moves it around/renames/etc, nothing breaks. The
        // id is stored in prefs just for convenience (and the prefs
        // will always update to the latest given id)
        if (name !== DEMO_BUDGET_ID) {
          return {
            id: name,
            ...(prefs.cloudFileId ? { cloudFileId: prefs.cloudFileId } : {}),
            ...(prefs.encryptKeyId ? { encryptKeyId: prefs.encryptKeyId } : {}),
            ...(prefs.groupId ? { groupId: prefs.groupId } : {}),
            ...(prefs.owner ? { owner: prefs.owner } : {}),
            name: prefs.budgetName || '(no name)',
          } satisfies Budget;
        }
      }

      return null;
    }),
  );

  return budgets.filter(Boolean) as Budget[];
}

async function getRemoteFiles() {
  return cloudStorage.listRemoteFiles();
}

async function getUserFileInfo(fileId: string) {
  return cloudStorage.getRemoteFile(fileId);
}

async function resetBudgetCache() {
  // Recomputing everything will update the cache
  await sheet.loadUserBudgets(db);
  sheet.get().recomputeAll();
  await sheet.waitOnSpreadsheet();
}

async function uploadBudget({ id }: { id?: Budget['id'] } = {}): Promise<{
  error?: { reason: string };
}> {
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
}

async function downloadBudget({
  cloudFileId,
}: {
  cloudFileId: Budget['cloudFileId'];
}): Promise<{ id?: Budget['id']; error?: { reason: string; meta?: unknown } }> {
  let result;
  try {
    result = await cloudStorage.download(cloudFileId);
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
  await loadBudget({ id });
  result = await syncBudget();

  if (result.error) {
    return result;
  }
  return { id };
}

// open and sync, but don’t close
async function syncBudget() {
  setSyncingMode('enabled');
  const result = await initialFullSync();

  return result;
}

async function loadBudget({ id }: { id: Budget['id'] }) {
  const currentPrefs = prefs.getPrefs();

  if (currentPrefs) {
    if (currentPrefs.id === id) {
      // If it's already loaded, do nothing
      return {};
    } else {
      // Otherwise, close the currently loaded budget
      await closeBudget();
    }
  }

  const res = await _loadBudget(id);

  return res;
}

async function createDemoBudget() {
  // Make sure the read only flag isn't leftover (normally it's
  // reset when signing in, but you don't have to sign in for the
  // demo budget)
  await asyncStorage.setItem('readOnly', '');

  return createBudget({
    budgetName: 'Demo Budget',
    testMode: true,
    testBudgetId: DEMO_BUDGET_ID,
  });
}

async function closeBudget() {
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
}

async function deleteBudget({
  id,
  cloudFileId,
}: {
  id?: Budget['id'];
  cloudFileId?: Budget['cloudFileId'];
}) {
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
}

async function duplicateBudget({
  id,
  newName,
  cloudSync,
  open,
}: {
  id: Budget['id'];
  newName: Budget['name'];
  cloudSync: boolean;
  open: 'none' | 'original' | 'copy';
}): Promise<Budget['id']> {
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
  const { error } = await _loadBudget(newId);
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

  await closeBudget();
  if (open === 'original') await _loadBudget(id);
  if (open === 'copy') await _loadBudget(newId);

  return newId;
}

async function createBudget({
  budgetName,
  avoidUpload,
  testMode,
  testBudgetId,
}: {
  budgetName?: Budget['name'];
  avoidUpload?: boolean;
  testMode?: boolean;
  testBudgetId?: Budget['name'];
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
  const { error } = await _loadBudget(id);
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
    await createTestBudget(mainApp.handlers);
  }

  return {};
}

async function importBudget({
  filepath,
  type,
}: {
  filepath: string;
  type: ImportableBudgetType;
}): Promise<{ error?: string }> {
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
}

async function exportBudget() {
  try {
    return {
      data: await cloudStorage.exportBuffer(),
    };
  } catch (err) {
    err.message = 'Error exporting budget: ' + err.message;
    captureException(err);
    return { error: 'internal-error' };
  }
}

function onSheetChange({ names }: { names: string[] }) {
  const nodes = names.map(name => {
    const node = sheet.get()._getNode(name);
    return { name: node.name, value: node.value };
  });
  connection.send('cells-changed', nodes);
}

async function _loadBudget(id: Budget['id']): Promise<{
  error?:
    | 'budget-not-found'
    | 'loading-budget'
    | 'out-of-sync-migrations'
    | 'out-of-sync-data'
    | 'opening-budget';
}> {
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
    await closeBudget();
    return { error: 'opening-budget' };
  }

  // Older versions didn't tag the file with the current user, so do
  // so now
  if (!prefs.getPrefs().userId) {
    const userId = await asyncStorage.getItem('user-token');
    await prefs.savePrefs({ userId });
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

    await closeBudget();
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

  if (!Platform.isBrowser && process.env.NODE_ENV !== 'test') {
    await startBackupService(id);
  }

  try {
    await sheet.loadSpreadsheet(db, onSheetChange);
  } catch (e) {
    captureException(e);
    await closeBudget();
    return { error: 'opening-budget' };
  }

  // This is a bit leaky, but we need to set the initial budget type
  const { value: budgetType = 'envelope' } =
    (await db.first<Pick<db.DbPreference, 'value'>>(
      'SELECT value from preferences WHERE id = ?',
      ['budgetType'],
    )) ?? {};
  sheet.get().meta().budgetType = budgetType as prefs.BudgetType;
  await budget.createAllBudgets();

  // Load all the in-memory state
  await mappings.loadMappings();
  await rules.loadRules();
  await syncMigrations.listen();
  await mainApp.startServices();

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

      await cloudStorage.possiblyUpload();
    }
  }

  app.events.emit('load-budget', { id });

  return {};
}

async function uploadFileWeb({
  filename,
  contents,
}: {
  filename: string;
  contents: ArrayBuffer;
}) {
  if (!Platform.isBrowser) {
    return null;
  }

  await fs.writeFile('/uploads/' + filename, contents);
  return {};
}

async function getBackups({ id }) {
  return getAvailableBackups(id);
}

async function loadBackup({ id, backupId }) {
  await _loadBackup(id, backupId);
}

async function makeBackup({ id }) {
  await _makeBackup(id);
}

async function getLastOpenedBackup() {
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
}
