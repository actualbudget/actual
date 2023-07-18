import { send } from '../../platform/client/fetch';
import * as constants from '../constants';

import { closeModal } from './modals';
import type { ActionResult } from './types';

export function loadPrefs(): ActionResult {
  return async (dispatch, getState) => {
    let prefs = await send('load-prefs');

    // Remove any modal state if switching between budgets
    let currentPrefs = getState().prefs.local;
    if (prefs && prefs.id && !currentPrefs) {
      dispatch(closeModal());
    }

    dispatch({
      type: constants.SET_PREFS,
      prefs,
      globalPrefs: await send('load-global-prefs'),
    });

    return prefs;
  };
}

export function savePrefs(prefs): ActionResult {
  return async dispatch => {
    await send('save-prefs', prefs);
    dispatch({
      type: constants.MERGE_LOCAL_PREFS,
      prefs,
    });
  };
}

export function loadGlobalPrefs(): ActionResult {
  return async (dispatch, getState) => {
    let globalPrefs = await send('load-global-prefs');
    dispatch({
      type: constants.SET_PREFS,
      prefs: getState().prefs.local,
      globalPrefs,
    });
    return globalPrefs;
  };
}

export function saveGlobalPrefs(prefs): ActionResult {
  return async dispatch => {
    await send('save-global-prefs', prefs);
    dispatch({
      type: constants.MERGE_GLOBAL_PREFS,
      globalPrefs: prefs,
    });
  };
}
