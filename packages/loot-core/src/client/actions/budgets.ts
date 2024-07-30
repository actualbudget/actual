// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import { getDownloadError, getSyncError } from '../../shared/errors';
import type { Handlers } from '../../types/handlers';
import * as constants from '../constants';

import { setAppState } from './app';
import { closeModal, pushModal } from './modals';
import { loadPrefs, loadGlobalPrefs } from './prefs';
import type { Dispatch, GetState } from './types';

export function loadBudgets() {
  return async (dispatch: Dispatch) => {
    const budgets = await send('get-budgets');

    dispatch({
      type: constants.SET_BUDGETS,
      budgets,
    });
  };
}

export function loadRemoteFiles() {
  return async (dispatch: Dispatch) => {
    const files = await send('get-remote-files');

    dispatch({
      type: constants.SET_REMOTE_FILES,
      files,
    });
  };
}

export function loadAllFiles() {
  return async (dispatch: Dispatch, getState: GetState) => {
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

export function loadBudget(id: string, loadingText = '', options = {}) {
  return async (dispatch: Dispatch) => {
    dispatch(setAppState({ loadingText }));

    // Loading a budget may fail
    const { error } = await send('load-budget', { id, ...options });

    if (error) {
      const message = getSyncError(error, id);
      if (error === 'out-of-sync-migrations' || error === 'out-of-sync-data') {
        // confirm is not available on iOS
        if (typeof window.confirm !== 'undefined') {
          const showBackups = window.confirm(
            message +
              ' Make sure the app is up-to-date. Do you want to load a backup?',
          );

          if (showBackups) {
            dispatch(pushModal('load-backup', { budgetId: id }));
          }
        } else {
          alert(message + ' Make sure the app is up-to-date.');
        }
      } else {
        alert(message);
      }

      dispatch(setAppState({ loadingText: null }));
      return;
    }

    dispatch(closeModal());

    await dispatch(loadPrefs());

    dispatch(setAppState({ loadingText: null }));
  };
}

export function closeBudget() {
  return async (dispatch: Dispatch, getState: GetState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      // This clears out all the app state so the user starts fresh
      dispatch({ type: constants.CLOSE_BUDGET });

      dispatch(setAppState({ loadingText: 'Closing...' }));
      await send('close-budget');
      dispatch(setAppState({ loadingText: null }));
      if (localStorage.getItem('SharedArrayBufferOverride')) {
        window.location.reload();
      }
    }
  };
}

export function closeBudgetUI() {
  return async (dispatch: Dispatch, getState: GetState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      dispatch({ type: constants.CLOSE_BUDGET });
    }
  };
}

export function deleteBudget(id?: string, cloudFileId?: string) {
  return async (dispatch: Dispatch) => {
    await send('delete-budget', { id, cloudFileId });
    await dispatch(loadAllFiles());
  };
}

export function createBudget({ testMode = false, demoMode = false } = {}) {
  return async (dispatch: Dispatch) => {
    dispatch(
      setAppState({
        loadingText: testMode || demoMode ? 'Making demo...' : '',
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

export function importBudget(
  filepath: string,
  type: Parameters<Handlers['import-budget']>[0]['type'],
) {
  return async (dispatch: Dispatch) => {
    const { error } = await send('import-budget', { filepath, type });
    if (error) {
      throw new Error(error);
    }

    dispatch(closeModal());

    await dispatch(loadPrefs());
    window.__navigate('/budget');
  };
}

export function uploadBudget(id: string) {
  return async (dispatch: Dispatch) => {
    const { error } = await send('upload-budget', { id });
    if (error) {
      return { error };
    }

    await dispatch(loadAllFiles());
    return {};
  };
}

export function closeAndLoadBudget(fileId: string) {
  return async (dispatch: Dispatch) => {
    await dispatch(closeBudget());
    dispatch(loadBudget(fileId, 'Loading...'));
  };
}

export function closeAndDownloadBudget(cloudFileId: string) {
  return async (dispatch: Dispatch) => {
    await dispatch(closeBudget());
    dispatch(downloadBudget(cloudFileId, { replace: true }));
  };
}

export function downloadBudget(cloudFileId: string, { replace = false } = {}) {
  return async (dispatch: Dispatch) => {
    dispatch(setAppState({ loadingText: 'Downloading...' }));

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
            dispatch(downloadBudget(cloudFileId, { replace }));
          },
        };

        dispatch(pushModal('fix-encryption-key', opts));
        dispatch(setAppState({ loadingText: null }));
      } else if (error.reason === 'file-exists') {
        alert(
          `A file with id “${error.meta.id}” already exists with the name “${error.meta.name}.” ` +
            'This file will be replaced. This probably happened because files were manually ' +
            'moved around outside of Actual.',
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
