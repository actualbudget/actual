import * as asyncStorage from '../../platform/server/asyncStorage';
import * as fs from '../../platform/server/fs';
import { stringToInteger } from '../../shared/util';
import {
  GlobalPrefs,
  MetadataPrefs,
  type SyncedPrefs,
} from '../../types/prefs';
import { createApp } from '../app';
import * as db from '../db';
import { getDefaultDocumentDir } from '../main';
import { mutator } from '../mutators';
import { post } from '../post';
import {
  getPrefs as _getMetadataPrefs,
  savePrefs as _saveMetadataPrefs,
} from '../prefs';
import { getServer } from '../server-config';
import { undoable } from '../undo';

export interface PreferencesHandlers {
  'preferences/save': typeof saveSyncedPrefs;
  'preferences/get': typeof getSyncedPrefs;
  'save-global-prefs': typeof saveGlobalPrefs;
  'load-global-prefs': typeof loadGlobalPrefs;
  'save-prefs': typeof saveMetadataPrefs;
  'load-prefs': typeof loadMetadataPrefs;
}

export const app = createApp<PreferencesHandlers>();

app.method('preferences/save', mutator(undoable(saveSyncedPrefs)));
app.method('preferences/get', getSyncedPrefs);
app.method('save-global-prefs', saveGlobalPrefs);
app.method('load-global-prefs', loadGlobalPrefs);
app.method('save-prefs', saveMetadataPrefs);
app.method('load-prefs', loadMetadataPrefs);

async function saveSyncedPrefs({
  id,
  value,
}: {
  id: keyof SyncedPrefs;
  value: string | undefined;
}) {
  await db.update('preferences', { id, value });
}

async function getSyncedPrefs(): Promise<SyncedPrefs> {
  const prefs = (await db.all('SELECT id, value FROM preferences')) as Array<{
    id: string;
    value: string;
  }>;

  return prefs.reduce<SyncedPrefs>((carry, { value, id }) => {
    carry[id as keyof SyncedPrefs] = value;
    return carry;
  }, {});
}

async function saveGlobalPrefs(prefs: GlobalPrefs) {
  if ('maxMonths' in prefs) {
    await asyncStorage.setItem('max-months', '' + prefs.maxMonths);
  }
  if ('documentDir' in prefs) {
    if (prefs.documentDir && (await fs.exists(prefs.documentDir))) {
      await asyncStorage.setItem('document-dir', prefs.documentDir);
    }
  }
  if ('floatingSidebar' in prefs) {
    await asyncStorage.setItem('floating-sidebar', '' + prefs.floatingSidebar);
  }
  if ('language' in prefs) {
    await asyncStorage.setItem('language', prefs.language);
  }
  if ('theme' in prefs) {
    await asyncStorage.setItem('theme', prefs.theme);
  }
  if ('preferredDarkTheme' in prefs) {
    await asyncStorage.setItem(
      'preferred-dark-theme',
      prefs.preferredDarkTheme,
    );
  }
  if ('serverSelfSignedCert' in prefs) {
    await asyncStorage.setItem(
      'server-self-signed-cert',
      prefs.serverSelfSignedCert,
    );
  }
  return 'ok';
}

async function loadGlobalPrefs(): Promise<GlobalPrefs> {
  const [
    [, floatingSidebar],
    [, maxMonths],
    [, documentDir],
    [, encryptKey],
    [, language],
    [, theme],
    [, preferredDarkTheme],
    [, serverSelfSignedCert],
  ] = await asyncStorage.multiGet([
    'floating-sidebar',
    'max-months',
    'document-dir',
    'encrypt-key',
    'language',
    'theme',
    'preferred-dark-theme',
    'server-self-signed-cert',
  ] as const);
  return {
    floatingSidebar: floatingSidebar === 'true',
    maxMonths: stringToInteger(maxMonths || '') || undefined,
    documentDir: documentDir || getDefaultDocumentDir(),
    keyId: encryptKey && JSON.parse(encryptKey).id,
    language,
    theme:
      theme === 'light' ||
      theme === 'dark' ||
      theme === 'auto' ||
      theme === 'development' ||
      theme === 'midnight'
        ? theme
        : 'auto',
    preferredDarkTheme:
      preferredDarkTheme === 'dark' || preferredDarkTheme === 'midnight'
        ? preferredDarkTheme
        : 'dark',
    serverSelfSignedCert: serverSelfSignedCert || undefined,
  };
}

async function saveMetadataPrefs(prefsToSet: MetadataPrefs) {
  const { cloudFileId } = _getMetadataPrefs();

  // Need to sync the budget name on the server as well
  if (prefsToSet.budgetName && cloudFileId) {
    const userToken = await asyncStorage.getItem('user-token');

    const syncServer = getServer()?.SYNC_SERVER;
    if (!syncServer) {
      throw new Error('No sync server set');
    }

    await post(syncServer + '/update-user-filename', {
      token: userToken,
      fileId: cloudFileId,
      name: prefsToSet.budgetName,
    });
  }

  await _saveMetadataPrefs(prefsToSet);
  return 'ok';
}

async function loadMetadataPrefs(): Promise<MetadataPrefs> {
  return _getMetadataPrefs();
}
