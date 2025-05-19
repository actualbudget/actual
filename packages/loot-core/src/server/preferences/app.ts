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
  if (!id) {
    return;
  }

  await db.update('preferences', { id, value });
}

async function getSyncedPrefs(): Promise<SyncedPrefs> {
  const prefs = await db.all<Pick<db.DbPreference, 'id' | 'value'>>(
    'SELECT id, value FROM preferences',
  );

  return prefs.reduce<SyncedPrefs>((carry, { value, id }) => {
    carry[id as keyof SyncedPrefs] = value;
    return carry;
  }, {});
}

async function saveGlobalPrefs(prefs: GlobalPrefs) {
  if (!prefs) {
    return 'ok';
  }

  if (prefs.maxMonths !== undefined) {
    await asyncStorage.setItem('max-months', '' + prefs.maxMonths);
  }
  if (prefs.categoryExpandedState !== undefined) {
    await asyncStorage.setItem(
      'category-expanded-state',
      '' + prefs.categoryExpandedState,
    );
  }
  if (prefs.documentDir !== undefined && (await fs.exists(prefs.documentDir))) {
    await asyncStorage.setItem('document-dir', prefs.documentDir);
  }
  if (prefs.floatingSidebar !== undefined) {
    await asyncStorage.setItem('floating-sidebar', '' + prefs.floatingSidebar);
  }
  if (prefs.language !== undefined) {
    await asyncStorage.setItem('language', prefs.language);
  }
  if (prefs.theme !== undefined) {
    await asyncStorage.setItem('theme', prefs.theme);
  }
  if (prefs.preferredDarkTheme !== undefined) {
    await asyncStorage.setItem(
      'preferred-dark-theme',
      prefs.preferredDarkTheme,
    );
  }
  if (prefs.serverSelfSignedCert !== undefined) {
    await asyncStorage.setItem(
      'server-self-signed-cert',
      prefs.serverSelfSignedCert,
    );
  }
  if (prefs.syncServerConfig !== undefined) {
    await asyncStorage.setItem('syncServerConfig', prefs.syncServerConfig);
  }
  return 'ok';
}

async function loadGlobalPrefs(): Promise<GlobalPrefs> {
  const {
    'floating-sidebar': floatingSidebar,
    'category-expanded-state': categoryExpandedState,
    'max-months': maxMonths,
    'document-dir': documentDir,
    'encrypt-key': encryptKey,
    language,
    theme,
    'preferred-dark-theme': preferredDarkTheme,
    'server-self-signed-cert': serverSelfSignedCert,
    syncServerConfig,
  } = await asyncStorage.multiGet([
    'floating-sidebar',
    'category-expanded-state',
    'max-months',
    'document-dir',
    'encrypt-key',
    'language',
    'theme',
    'preferred-dark-theme',
    'server-self-signed-cert',
    'syncServerConfig',
  ] as const);
  return {
    floatingSidebar: floatingSidebar === 'true',
    categoryExpandedState: stringToInteger(categoryExpandedState || '') || 0,
    maxMonths: stringToInteger(maxMonths || '') || 1,
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
    syncServerConfig: syncServerConfig || undefined,
  };
}

async function saveMetadataPrefs(prefsToSet: MetadataPrefs) {
  if (!prefsToSet) {
    return 'ok';
  }

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
