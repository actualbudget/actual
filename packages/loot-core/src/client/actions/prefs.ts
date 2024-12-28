import { send } from '../../platform/client/fetch';
import { parseNumberFormat, setNumberFormat } from '../../shared/util';
import {
  type GlobalPrefs,
  type MetadataPrefs,
  type SyncedPrefs,
} from '../../types/prefs';
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

    const [globalPrefs, syncedPrefs] = await Promise.all([
      send('load-global-prefs'),
      send('preferences/get'),
    ]);

    dispatch({
      type: constants.SET_PREFS,
      prefs,
      globalPrefs,
      syncedPrefs,
    });

    // Certain loot-core utils depend on state outside of the React tree, update them
    setNumberFormat(
      parseNumberFormat({
        format: syncedPrefs.numberFormat,
        hideFraction: syncedPrefs.hideFraction,
      }),
    );

    return prefs;
  };
}

export function savePrefs(prefs: MetadataPrefs) {
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
      syncedPrefs: getState().prefs.synced,
    });
    return globalPrefs;
  };
}

export function saveGlobalPrefs(
  prefs: GlobalPrefs,
  onSaveGlobalPrefs?: () => void,
) {
  return async (dispatch: Dispatch) => {
    await send('save-global-prefs', prefs);
    dispatch({
      type: constants.MERGE_GLOBAL_PREFS,
      globalPrefs: prefs,
    });
    onSaveGlobalPrefs?.();
  };
}

export function saveSyncedPrefs(prefs: SyncedPrefs) {
  return async (dispatch: Dispatch) => {
    await Promise.all(
      Object.entries(prefs).map(([prefName, value]) =>
        send('preferences/save', {
          id: prefName as keyof SyncedPrefs,
          value,
        }),
      ),
    );
    dispatch({
      type: constants.MERGE_SYNCED_PREFS,
      syncedPrefs: prefs,
    });
  };
}
