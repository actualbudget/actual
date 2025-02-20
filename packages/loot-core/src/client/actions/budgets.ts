// @ts-strict-ignore
import { t } from 'i18next';

import { send } from '../../platform/client/fetch';
import { getDownloadError, getSyncError } from '../../shared/errors';
import type { Handlers } from '../../types/handlers';
import { setAppState } from '../app/appSlice';
import * as constants from '../constants';
import { type AppDispatch, type GetRootState } from '../store';

import { closeModal, pushModal } from './modals';
import { loadPrefs, loadGlobalPrefs } from './prefs';

export function loadBudgets() {
  return async (dispatch: AppDispatch) => {
    const budgets = await send('get-budgets');

    dispatch({
      type: constants.SET_BUDGETS,
      budgets,
    });
  };
}

export function loadRemoteFiles() {
  return async (dispatch: AppDispatch) => {
    const files = await send('get-remote-files');

    dispatch({
      type: constants.SET_REMOTE_FILES,
      files,
    });
  };
}

export function loadAllFiles() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const budgets = await send('get-budgets');
    const files = await send('get-remote-files');

    dispatch({
      type: constants.SET_ALL_FILES,
      budgets,
      remoteFiles: files,
    });

    return getState().budgets.allFiles;
  };
}

export function loadBudget(id: Parameters<Handlers['load-budget']>[0]['id']) {
  return async (dispatch: AppDispatch) => {
    dispatch(setAppState({ loadingText: t('Loading...') }));

    // Loading a budget may fail
    const { error } = await send('load-budget', { id });

    if (error) {
      const message = getSyncError(error, id);
      if (error === 'out-of-sync-migrations') {
        dispatch(pushModal('out-of-sync-migrations'));
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
            dispatch(pushModal('load-backup', { budgetId: id }));
          }
        } else {
          alert(message + ' ' + t('Make sure the app is up-to-date.'));
        }
      } else {
        alert(message);
      }
    } else {
      dispatch(closeModal());

      await dispatch(loadPrefs());
    }

    dispatch(setAppState({ loadingText: null }));
  };
}

export function closeBudget() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      // This clears out all the app state so the user starts fresh
      dispatch({ type: constants.CLOSE_BUDGET });

      dispatch(setAppState({ loadingText: t('Closing...') }));
      await send('close-budget');
      dispatch(setAppState({ loadingText: null }));
      if (localStorage.getItem('SharedArrayBufferOverride')) {
        window.location.reload();
      }
    }
  };
}

export function closeBudgetUI() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      dispatch({ type: constants.CLOSE_BUDGET });
    }
  };
}

export function deleteBudget(
  id?: Parameters<Handlers['delete-budget']>[0]['id'],
  cloudFileId?: Parameters<Handlers['delete-budget']>[0]['cloudFileId'],
) {
  return async (dispatch: AppDispatch) => {
    await send('delete-budget', { id, cloudFileId });
    await dispatch(loadAllFiles());
  };
}

export function createBudget({ testMode = false, demoMode = false } = {}) {
  return async (dispatch: AppDispatch) => {
    dispatch(
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

    dispatch(closeModal());

    await dispatch(loadAllFiles());
    await dispatch(loadPrefs());

    // Set the loadingText to null after we've loaded the budget prefs
    // so that the existing manager page doesn't flash
    dispatch(setAppState({ loadingText: null }));
  };
}

export async function validateBudgetName(name: string): Promise<{
  valid: boolean;
  message?: string;
}> {
  return send('validate-budget-name', { name });
}

export async function uniqueBudgetName(name: string): Promise<string> {
  return send('unique-budget-name', { name });
}

export function duplicateBudget({
  id,
  oldName,
  newName,
  managePage,
  loadBudget = 'none',
  cloudSync,
}: {
  id?: string | undefined;
  cloudId?: string | undefined;
  oldName: string;
  newName: string;
  managePage?: boolean;
  loadBudget: 'none' | 'original' | 'copy';
  /**
   * cloudSync is used to determine if the duplicate budget
   * should be synced to the server
   */
  cloudSync: boolean;
}) {
  return async (dispatch: AppDispatch) => {
    try {
      dispatch(
        setAppState({
          loadingText: t('Duplicating: {{oldName}} to: {{newName}}', {
            oldName,
            newName,
          }),
        }),
      );

      await send('duplicate-budget', {
        id,
        newName,
        cloudSync,
        open: loadBudget,
      });

      dispatch(closeModal());

      if (managePage) {
        await dispatch(loadAllFiles());
      }
    } catch (error) {
      console.error('Error duplicating budget:', error);
      throw error instanceof Error
        ? error
        : new Error('Error duplicating budget: ' + String(error));
    } finally {
      dispatch(setAppState({ loadingText: null }));
    }
  };
}

export function importBudget(
  filepath: Parameters<Handlers['import-budget']>[0]['filepath'],
  type: Parameters<Handlers['import-budget']>[0]['type'],
) {
  return async (dispatch: AppDispatch) => {
    const { error } = await send('import-budget', { filepath, type });
    if (error) {
      throw new Error(error);
    }

    dispatch(closeModal());

    await dispatch(loadPrefs());
  };
}

export function uploadBudget(
  id?: Parameters<Handlers['upload-budget']>[0]['id'],
) {
  return async (dispatch: AppDispatch) => {
    const { error } = await send('upload-budget', { id });
    if (error) {
      return { error };
    }

    await dispatch(loadAllFiles());
    return {};
  };
}

export function closeAndLoadBudget(fileId: string) {
  return async (dispatch: AppDispatch) => {
    await dispatch(closeBudget());
    await dispatch(loadBudget(fileId));
  };
}

export function closeAndDownloadBudget(
  cloudFileId: Parameters<typeof downloadBudget>[0],
) {
  return async (dispatch: AppDispatch) => {
    await dispatch(closeBudget());
    dispatch(downloadBudget(cloudFileId, { replace: true }));
  };
}

export function downloadBudget(
  cloudFileId: Parameters<Handlers['download-budget']>[0]['fileId'],
  { replace = false } = {},
) {
  return async (dispatch: AppDispatch) => {
    dispatch(
      setAppState({
        loadingText: t('Downloading...'),
      }),
    );

    const { id, error } = await send('download-budget', {
      fileId: cloudFileId,
    });

    if (error) {
      if (error.reason === 'decrypt-failure') {
        const opts = {
          hasExistingKey: error.meta && error.meta.isMissingKey,
          cloudFileId,
          onSuccess: () => {
            dispatch(downloadBudget(cloudFileId, { replace }));
          },
        };

        dispatch(pushModal('fix-encryption-key', opts));
        dispatch(setAppState({ loadingText: null }));
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

        return dispatch(downloadBudget(cloudFileId, { replace: true }));
      } else {
        dispatch(setAppState({ loadingText: null }));
        alert(getDownloadError(error));
      }
      return null;
    } else {
      await Promise.all([
        dispatch(loadGlobalPrefs()),
        dispatch(loadAllFiles()),
        dispatch(loadBudget(id)),
      ]);
      dispatch(setAppState({ loadingText: null }));
    }

    return id;
  };
}
