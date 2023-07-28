import { send } from '../../platform/client/fetch';
import * as constants from '../constants';
import type { GlobalPrefs, LocalPrefs } from '../state-types/prefs';

import { closeModal } from './modals';
import type { Dispatch, GetState } from './types';

export function loadPrefs() {
  return async (dispatch: Dispatch, getState: GetState) => {
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

export function savePrefs(prefs: Partial<LocalPrefs>) {
  return async (dispatch: Dispatch) => {
    await send('save-prefs', prefs);
    dispatch({
      type: constants.MERGE_LOCAL_PREFS,
      prefs,
    });
  };
}

export function loadGlobalPrefs() {
  return async (dispatch: Dispatch, getState: GetState) => {
    let globalPrefs = await send('load-global-prefs');
    dispatch({
      type: constants.SET_PREFS,
      prefs: getState().prefs.local,
      globalPrefs,
    });
    return globalPrefs;
  };
}

export function saveGlobalPrefs(prefs: Partial<GlobalPrefs>) {
  return async (dispatch: Dispatch) => {
    await send('save-global-prefs', prefs);
    dispatch({
      type: constants.MERGE_GLOBAL_PREFS,
      globalPrefs: prefs,
    });
  };
}
