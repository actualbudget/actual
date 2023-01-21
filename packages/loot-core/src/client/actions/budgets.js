import { send } from '../../platform/client/fetch';
import { getDownloadError } from '../../shared/errors';
import constants from '../constants';

import { setAppState } from './app';
import { closeModal, pushModal } from './modals';
import { loadPrefs, loadGlobalPrefs } from './prefs';
import { startTutorialFirstTime } from './tutorial';

export function updateStatusText(text) {
  return (dispatch, getState) => {
    const { loadingText } = getState().app;
    // The presence of any loading text puts the app in a "loading"
    // state. We only ever want to update the text, we never want to
    // set the app into a loading state. It's expected for workflows
    // to set a blank loading text to show the loading screen.
    if (loadingText != null) {
      dispatch(setAppState({ loadingText: text }));
    }
  };
}

export function loadBudgets() {
  return async dispatch => {
    const budgets = await send('get-budgets');

    dispatch({
      type: constants.SET_BUDGETS,
      budgets
    });
  };
}

export function loadRemoteFiles() {
  return async dispatch => {
    const files = await send('get-remote-files');

    dispatch({
      type: constants.SET_REMOTE_FILES,
      files
    });
  };
}

export function loadAllFiles() {
  return async (dispatch, getState) => {
    const budgets = await send('get-budgets');
    const files = await send('get-remote-files');

    dispatch({
      type: constants.SET_ALL_FILES,
      budgets,
      remoteFiles: files
    });

    return getState().budgets.allFiles;
  };
}

export function loadBudget(id, loadingText = '', options = {}) {
  return async (dispatch, getState) => {
    dispatch(setAppState({ loadingText }));

    // Loading a budget may fail
    let { error } = await send('load-budget', { id, ...options });

    if (error) {
      if (error === 'out-of-sync-migrations' || error === 'out-of-sync-data') {
        // confirm is not available on iOS
        // eslint-disable-next-line
        if (typeof confirm !== 'undefined') {
          // eslint-disable-next-line
          let showBackups = confirm(
            'This budget cannot be loaded with this version of the app. ' +
              'Make sure the app is up-to-date. Do you want to load a backup?'
          );

          if (showBackups) {
            dispatch(pushModal('load-backup', { budgetId: id }));
          }
        } else {
          alert(
            'This budget cannot be loaded with this version of the app. ' +
              'Make sure the app is up-to-date.'
          );
        }
      } else if (error === 'budget-not-found') {
        alert(
          'Budget file could not be found. If you changed something manually, please restart the app.'
        );
      } else {
        alert(
          'Error loading budget. Please contact help@actualbudget.com for support.'
        );
      }

      dispatch(setAppState({ loadingText: null }));
      return;
    }

    dispatch(closeModal());

    await dispatch(loadPrefs());

    const prefs = getState().prefs.local;
    dispatch(setAppState({ loadingText: null }));
    dispatch(setAppState({ maxMonths: prefs.maxMonths }));
    dispatch(startTutorialFirstTime());
  };
}

export function closeBudget() {
  return async (dispatch, getState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      // This clears out all the app state so the user starts fresh
      dispatch({ type: constants.CLOSE_BUDGET });

      dispatch(setAppState({ loadingText: 'Closing...' }));
      await send('close-budget');
      dispatch(setAppState({ loadingText: null }));
    }
  };
}

export function closeBudgetUI() {
  return async (dispatch, getState) => {
    let prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      dispatch({ type: constants.CLOSE_BUDGET });
    }
  };
}

export function deleteBudget(id, cloudFileId) {
  return async dispatch => {
    await send('delete-budget', { id, cloudFileId });
    await dispatch(loadAllFiles());
  };
}

export function createBudget({ testMode, demoMode } = {}) {
  return async (dispatch, getState) => {
    dispatch(
      setAppState({ loadingText: testMode || demoMode ? 'Making demo...' : '' })
    );

    if (demoMode) {
      await send('create-demo-budget');
    } else {
      await send('create-budget', { testMode });
    }

    dispatch(closeModal());

    await dispatch(loadAllFiles());
    await dispatch(loadPrefs());
    dispatch(startTutorialFirstTime());

    // Set the loadingText to null after we've loaded the budget prefs
    // so that the existing manager page doesn't flash
    dispatch(setAppState({ loadingText: null }));
  };
}

export function importBudget(filepath, type) {
  return async (dispatch, getState) => {
    const { error } = await send('import-budget', { filepath, type });
    if (error) {
      throw new Error(error);
    }

    dispatch(closeModal());

    await dispatch(loadPrefs());
    dispatch(startTutorialFirstTime());
  };
}

export function uploadBudget(id) {
  return async dispatch => {
    let { error } = await send('upload-budget', { id });
    if (error) {
      return { error };
    }

    await dispatch(loadAllFiles());
    return {};
  };
}

export function closeAndDownloadBudget(cloudFileId) {
  return async dispatch => {
    // It's very important that we set this loading message before
    // closing the budget. Otherwise, the manager will ignore our
    // loading message and clear it when it loads, showing the file
    // list which we don't want
    dispatch(setAppState({ loadingText: 'Downloading...' }));
    await dispatch(closeBudget());
    dispatch(downloadBudget(cloudFileId, { replace: true }));
  };
}

export function downloadBudget(cloudFileId, { replace } = {}) {
  return async dispatch => {
    dispatch(setAppState({ loadingText: 'Downloading...' }));

    let { id, error } = await send('download-budget', {
      fileId: cloudFileId,
      replace
    });

    if (error) {
      if (error.reason === 'decrypt-failure') {
        let opts = {
          hasExistingKey: error.meta && error.meta.isMissingKey,
          cloudFileId,
          onSuccess: () => {
            dispatch(downloadBudget(cloudFileId, { replace }));
          }
        };

        dispatch(pushModal('fix-encryption-key', opts));
        dispatch(setAppState({ loadingText: null }));
      } else if (error.reason === 'file-exists') {
        alert(
          `A file with id "${error.meta.id}" already exists with the name "${error.meta.name}". ` +
            'This file will be replaced. This probably happened because files were manually ' +
            'moved around outside of Actual.'
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
        dispatch(loadBudget(id))
      ]);
      dispatch(setAppState({ loadingText: null }));
    }

    return id;
  };
}

export function getYNAB4Imports() {
  return async dispatch => {
    let imports = await send('get-ynab4-files');
    dispatch({
      type: 'SET_AVAILABLE_IMPORTS',
      imports
    });
    return imports;
  };
}
