import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { t } from 'i18next';

import { send } from '../../platform/client/fetch';
import { type RemoteFile } from '../../server/cloud-storage';
import { getDownloadError, getSyncError } from '../../shared/errors';
import { type Budget } from '../../types/budget';
import { type File } from '../../types/file';
import { type Handlers } from '../../types/handlers';
import { closeModal, loadGlobalPrefs, loadPrefs, pushModal } from '../actions';
import { setAppState } from '../app/appSlice';
import * as constants from '../constants';
import { createAppAsyncThunk } from '../redux';

const sliceName = 'budgets';

export const loadBudgets = createAppAsyncThunk(
  `${sliceName}/loadBudgets`,
  async (_, { dispatch }) => {
    const budgets = await send('get-budgets');

    await dispatch(setBudgets({ budgets }));
  },
);

export const loadRemoteFiles = createAppAsyncThunk(
  `${sliceName}/loadRemoteFiles`,
  async (_, { dispatch }) => {
    const files = await send('get-remote-files');

    await dispatch(setRemoteFiles({ remoteFiles: files }));
  },
);

export const loadAllFiles = createAppAsyncThunk(
  `${sliceName}/loadAllFiles`,
  async (_, { dispatch, getState }) => {
    const budgets = await send('get-budgets');
    const files = await send('get-remote-files');

    await dispatch(setAllFiles({ budgets, remoteFiles: files }));

    return getState().budgets.allFiles;
  },
);

type LoadBudgetPayload = {
  id: string;
  // TODO: Is this still needed?
  options?: Record<string, unknown>;
};

export const loadBudget = createAppAsyncThunk(
  `${sliceName}/loadBudget`,
  async ({ id, options = {} }: LoadBudgetPayload, { dispatch }) => {
    await dispatch(setAppState({ loadingText: t('Loading...') }));

    // Loading a budget may fail
    const { error } = await send('load-budget', { id, ...options });

    if (error) {
      const message = getSyncError(error, id);
      if (error === 'out-of-sync-migrations') {
        await dispatch(pushModal('out-of-sync-migrations'));
      } else if (error === 'out-of-sync-data') {
        // confirm is not available on iOS
        if (typeof window.confirm !== 'undefined') {
          const showBackups = window.confirm(
            message +
              ' ' +
              t(
                'Make sure the app is up-to-date. Do you want to load a backup?',
              ),
          );

          if (showBackups) {
            await dispatch(pushModal('load-backup', { budgetId: id }));
          }
        } else {
          alert(message + ' ' + t('Make sure the app is up-to-date.'));
        }
      } else {
        alert(message);
      }
    } else {
      await dispatch(closeModal());
      await dispatch(loadPrefs());
    }

    await dispatch(setAppState({ loadingText: null }));
  },
);

export const closeBudget = createAppAsyncThunk(
  `${sliceName}/closeBudget`,
  async (_, { dispatch, getState }) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      // This clears out all the app state so the user starts fresh
      // TODO: Change to use an action once CLOSE_BUDGET is migrated to redux toolkit.
      await dispatch({ type: constants.CLOSE_BUDGET });

      await dispatch(setAppState({ loadingText: t('Closing...') }));
      await send('close-budget');
      await dispatch(setAppState({ loadingText: null }));
      if (localStorage.getItem('SharedArrayBufferOverride')) {
        window.location.reload();
      }
    }
  },
);

export const closeBudgetUI = createAppAsyncThunk(
  `${sliceName}/closeBudgetUI`,
  async (_, { dispatch, getState }) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      // TODO: Change to use an action once CLOSE_BUDGET is migrated to redux toolkit.
      await dispatch({ type: constants.CLOSE_BUDGET });
    }
  },
);

type DeleteBudgetPayload = {
  id?: string;
  cloudFileId?: string;
};

export const deleteBudget = createAppAsyncThunk(
  `${sliceName}/deleteBudget`,
  async ({ id, cloudFileId }: DeleteBudgetPayload, { dispatch }) => {
    await send('delete-budget', { id, cloudFileId });
    await dispatch(loadAllFiles());
  },
);

type CreateBudgetPayload = {
  testMode?: boolean;
  demoMode?: boolean;
};

export const createBudget = createAppAsyncThunk(
  `${sliceName}/createBudget`,
  async (
    { testMode = false, demoMode = false }: CreateBudgetPayload,
    { dispatch },
  ) => {
    await dispatch(
      setAppState({
        loadingText:
          testMode || demoMode ? t('Making demo...') : t('Creating budget...'),
      }),
    );

    if (demoMode) {
      await send('create-demo-budget');
    } else {
      await send('create-budget', { testMode });
    }

    await dispatch(closeModal());

    await dispatch(loadAllFiles());
    await dispatch(loadPrefs());

    // Set the loadingText to null after we've loaded the budget prefs
    // so that the existing manager page doesn't flash
    await dispatch(setAppState({ loadingText: null }));
  },
);

type DuplicateBudgetPayload = {
  id?: string;
  cloudId?: string;
  oldName: string;
  newName: string;
  managePage?: boolean;
  loadBudget: 'none' | 'original' | 'copy';
  /**
   * cloudSync is used to determine if the duplicate budget
   * should be synced to the server
   */
  cloudSync?: boolean;
};

export const duplicateBudget = createAppAsyncThunk(
  `${sliceName}/duplicateBudget`,
  async (
    {
      id,
      cloudId,
      oldName,
      newName,
      managePage,
      loadBudget = 'none',
      cloudSync,
    }: DuplicateBudgetPayload,
    { dispatch },
  ) => {
    try {
      await dispatch(
        setAppState({
          loadingText: t('Duplicating: {{oldName}} to: {{newName}}', {
            oldName,
            newName,
          }),
        }),
      );

      await send('duplicate-budget', {
        id,
        cloudId,
        newName,
        cloudSync,
        open: loadBudget,
      });

      await dispatch(closeModal());

      if (managePage) {
        await dispatch(loadAllFiles());
      }
    } catch (error) {
      console.error('Error duplicating budget:', error);
      throw error instanceof Error
        ? error
        : new Error('Error duplicating budget: ' + String(error));
    } finally {
      await dispatch(setAppState({ loadingText: null }));
    }
  },
);

type ImportBudgetPayload = {
  filepath: string;
  type: Parameters<Handlers['import-budget']>[0]['type'];
};

export const importBudget = createAppAsyncThunk(
  `${sliceName}/importBudget`,
  async ({ filepath, type }: ImportBudgetPayload, { dispatch }) => {
    const { error } = await send('import-budget', { filepath, type });
    if (error) {
      throw new Error(error);
    }

    await dispatch(closeModal());
    await dispatch(loadPrefs());
  },
);

type UploadBudgetPayload = {
  id?: string;
};

export const uploadBudget = createAppAsyncThunk(
  `${sliceName}/uploadBudget`,
  async ({ id }: UploadBudgetPayload, { dispatch }) => {
    const { error } = await send('upload-budget', { id });
    if (error) {
      return { error };
    }

    await dispatch(loadAllFiles());
    return {};
  },
);

export const closeAndLoadBudget = createAppAsyncThunk(
  `${sliceName}/closeAndLoadBudget`,
  async ({ fileId }: { fileId: string }, { dispatch }) => {
    await dispatch(closeBudget());
    await dispatch(loadBudget({ id: fileId }));
  },
);

type CloseAndDownloadBudgetPayload = {
  cloudFileId: string;
};

export const closeAndDownloadBudget = createAppAsyncThunk(
  `${sliceName}/closeAndDownloadBudget`,
  async ({ cloudFileId }: CloseAndDownloadBudgetPayload, { dispatch }) => {
    await dispatch(closeBudget());
    await dispatch(downloadBudget({ cloudFileId, replace: true }));
  },
);

type DownloadBudgetPayload = {
  cloudFileId: string;
  replace?: boolean;
};

export const downloadBudget = createAppAsyncThunk(
  `${sliceName}/downloadBudget`,
  async (
    { cloudFileId, replace = false }: DownloadBudgetPayload,
    { dispatch },
  ): Promise<string | null> => {
    await dispatch(
      setAppState({
        loadingText: t('Downloading...'),
      }),
    );

    const { id, error } = await send('download-budget', {
      fileId: cloudFileId,
      replace,
    });

    if (error) {
      if (error.reason === 'decrypt-failure') {
        const opts = {
          hasExistingKey: error.meta && error.meta.isMissingKey,
          cloudFileId,
          onSuccess: () => {
            dispatch(downloadBudget({ cloudFileId, replace }));
          },
        };

        await dispatch(pushModal('fix-encryption-key', opts));
        await dispatch(setAppState({ loadingText: null }));
      } else if (error.reason === 'file-exists') {
        alert(
          t(
            'A file with id “{{id}}” already exists with the name “{{name}}”. ' +
              'This file will be replaced. This probably happened because files were manually ' +
              'moved around outside of Actual.',
            {
              id: error.meta.id,
              name: error.meta.name,
            },
          ),
        );

        return await dispatch(
          downloadBudget({ cloudFileId, replace: true }),
        ).unwrap();
      } else {
        await dispatch(setAppState({ loadingText: null }));
        alert(getDownloadError(error));
      }
      return null;
    } else {
      await Promise.all([
        dispatch(loadGlobalPrefs()),
        dispatch(loadAllFiles()),
        dispatch(loadBudget({ id })),
      ]);
      await dispatch(setAppState({ loadingText: null }));
    }

    return id;
  },
);

type LoadBackupPayload = {
  budgetId: string;
  backupId: string;
};

// Take in the budget id so that backups can be loaded when a budget isn't opened
export const loadBackup = createAppAsyncThunk(
  `${sliceName}/loadBackup`,
  async ({ budgetId, backupId }: LoadBackupPayload, { dispatch, getState }) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    await dispatch(loadBudget({ id: budgetId }));
  },
);

export const makeBackup = createAppAsyncThunk(
  `${sliceName}/makeBackup`,
  async (_, { getState }) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await send('backup-make', { id: prefs.id });
    }
  },
);

type BudgetsState = {
  budgets: Budget[];
  remoteFiles: RemoteFile[] | null;
  allFiles: File[] | null;
};

const initialState: BudgetsState = {
  budgets: [],
  remoteFiles: null,
  allFiles: null,
};

type SetBudgetsPayload = {
  budgets: Budget[];
};

type SetRemoteFilesPayload = {
  remoteFiles: RemoteFile[];
};

type SetAllFilesPayload = {
  budgets: Budget[];
  remoteFiles: RemoteFile[];
};

const budgetsSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {
    setBudgets(state, action: PayloadAction<SetBudgetsPayload>) {
      state.budgets = action.payload.budgets;
      state.allFiles = reconcileFiles(
        action.payload.budgets,
        state.remoteFiles,
      );
    },
    setRemoteFiles(state, action: PayloadAction<SetRemoteFilesPayload>) {
      state.remoteFiles = action.payload.remoteFiles;
      state.allFiles = reconcileFiles(
        state.budgets,
        action.payload.remoteFiles,
      );
    },
    setAllFiles(state, action: PayloadAction<SetAllFilesPayload>) {
      state.budgets = action.payload.budgets;
      state.remoteFiles = action.payload.remoteFiles;
      state.allFiles = reconcileFiles(
        action.payload.budgets,
        action.payload.remoteFiles,
      );
    },
    signOut(state) {
      state.allFiles = null;
    },
  },
});

export const { name, reducer, getInitialState } = budgetsSlice;

export const actions = {
  ...budgetsSlice.actions,
  loadBudgets,
  loadRemoteFiles,
  loadAllFiles,
  loadBudget,
  closeBudget,
  closeBudgetUI,
  deleteBudget,
  createBudget,
  duplicateBudget,
  importBudget,
  uploadBudget,
  closeAndLoadBudget,
  closeAndDownloadBudget,
  downloadBudget,
  loadBackup,
  makeBackup,
};

export const { setBudgets, setRemoteFiles, setAllFiles, signOut } = actions;

function sortFiles(arr: File[]) {
  arr.sort((x, y) => {
    const name1 = x.name.toLowerCase();
    const name2 = y.name.toLowerCase();
    let i = name1 < name2 ? -1 : name1 > name2 ? 1 : 0;
    if (i === 0) {
      const xId = x.state === 'remote' ? x.cloudFileId : x.id;
      const yId = x.state === 'remote' ? x.cloudFileId : x.id;
      i = xId < yId ? -1 : xId > yId ? 1 : 0;
    }
    return i;
  });
  return arr;
}

// States of a file:
// 1. local - Only local (not uploaded/synced)
// 2. remote - Unavailable locally, available to download
// 3. synced - Downloaded & synced
// 4. detached - Downloaded but broken group id (reset sync state)
// 5. broken - user shouldn't have access to this file
// 6. unknown - user is offline so can't determine the status
function reconcileFiles(
  localFiles: Budget[],
  remoteFiles: RemoteFile[] | null,
): File[] {
  const reconciled = new Set();

  const files = localFiles.map((localFile): File & { deleted: boolean } => {
    const { cloudFileId, groupId } = localFile;
    if (cloudFileId && groupId) {
      // This is the case where for some reason getting the files from
      // the server failed. We don't want to scare the user, just show
      // an unknown state and tell them it'll be OK once they come
      // back online
      if (remoteFiles == null) {
        return {
          ...localFile,
          cloudFileId,
          groupId,
          deleted: false,
          state: 'unknown',
          hasKey: true,
          owner: '',
        };
      }

      const remote = remoteFiles.find(f => localFile.cloudFileId === f.fileId);
      if (remote) {
        // Mark reconciled
        reconciled.add(remote.fileId);

        if (remote.groupId === localFile.groupId) {
          return {
            ...localFile,
            cloudFileId,
            groupId,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'synced',
            owner: remote.owner,
            usersWithAccess: remote.usersWithAccess,
          };
        } else {
          return {
            ...localFile,
            cloudFileId,
            groupId,
            name: remote.name,
            deleted: remote.deleted,
            encryptKeyId: remote.encryptKeyId,
            hasKey: remote.hasKey,
            state: 'detached',
            owner: remote.owner,
            usersWithAccess: remote.usersWithAccess,
          };
        }
      } else {
        return {
          ...localFile,
          cloudFileId,
          groupId,
          deleted: false,
          state: 'broken',
          hasKey: true,
          owner: '',
        };
      }
    } else {
      return { ...localFile, deleted: false, state: 'local', hasKey: true };
    }
  });

  const sorted = sortFiles(
    files
      .concat(
        (remoteFiles || [])
          .filter(f => !reconciled.has(f.fileId))
          .map(f => {
            return {
              cloudFileId: f.fileId,
              groupId: f.groupId,
              name: f.name,
              deleted: f.deleted,
              encryptKeyId: f.encryptKeyId,
              hasKey: f.hasKey,
              state: 'remote',
              owner: f.owner,
              usersWithAccess: f.usersWithAccess,
            };
          }),
      )
      .filter(f => !f.deleted),
  );

  // One last pass to list all the broken (unauthorized) files at the
  // bottom
  return sorted
    .filter(f => f.state !== 'broken')
    .concat(sorted.filter(f => f.state === 'broken'));
}
