// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import type * as prefs from '../../types/prefs';
import * as constants from '../constants';

import { closeModal } from './modals';
import type { Dispatch, GetState } from './types';

export function loadPrefs() {
  return async (dispatch: Dispatch, getState: GetState) => {
    const prefs = await send('load-prefs');

    // Remove any modal state if switching between budgets
    const currentPrefs = getState().prefs.local;
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

export function savePrefs(prefs: Partial<prefs.LocalPrefs>) {
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
    const globalPrefs = await send('load-global-prefs');
    dispatch({
      type: constants.SET_PREFS,
      prefs: getState().prefs.local,
      globalPrefs,
    });
    return globalPrefs;
  };
}

export function saveGlobalPrefs(prefs: Partial<prefs.GlobalPrefs>) {
  return async (dispatch: Dispatch) => {
    await send('save-global-prefs', prefs);
    dispatch({
      type: constants.MERGE_GLOBAL_PREFS,
      globalPrefs: prefs,
    });
  };
}
