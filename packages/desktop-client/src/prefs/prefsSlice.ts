import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { send } from 'loot-core/platform/client/fetch';
import { parseNumberFormat, setNumberFormat } from 'loot-core/shared/util';
import {
  type GlobalPrefs,
  type MetadataPrefs,
  type SyncedPrefs,
} from 'loot-core/types/prefs';

import { resetApp } from '@desktop-client/app/appSlice';
import { setI18NextLanguage } from '@desktop-client/i18n';
import { closeModal } from '@desktop-client/modals/modalsSlice';
import { createAppAsyncThunk } from '@desktop-client/redux';

const sliceName = 'prefs';

type PrefsState = {
  local: MetadataPrefs;
  global: GlobalPrefs;
  synced: SyncedPrefs;
};

const initialState: PrefsState = {
  local: {},
  global: {},
  synced: {},
};

export const loadPrefs = createAppAsyncThunk(
  `${sliceName}/loadPrefs`,
  async (_, { dispatch, getState }) => {
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

    dispatch(
      setPrefs({ local: prefs, global: globalPrefs, synced: syncedPrefs }),
    );

    // Certain loot-core utils depend on state outside of the React tree, update them
    setNumberFormat(
      parseNumberFormat({
        format: syncedPrefs.numberFormat,
        hideFraction: syncedPrefs.hideFraction,
      }),
    );

    // We need to load translations before the app renders
    setI18NextLanguage(globalPrefs.language ?? '');

    return prefs;
  },
);

type SavePrefsPayload = {
  prefs: MetadataPrefs;
};

export const savePrefs = createAppAsyncThunk(
  `${sliceName}/savePrefs`,
  async ({ prefs }: SavePrefsPayload, { dispatch }) => {
    await send('save-prefs', prefs);
    dispatch(mergeLocalPrefs(prefs));
  },
);

export const loadGlobalPrefs = createAppAsyncThunk(
  `${sliceName}/loadGlobalPrefs`,
  async (_, { dispatch, getState }) => {
    const globalPrefs = await send('load-global-prefs');
    dispatch(
      setPrefs({
        local: getState().prefs.local,
        global: globalPrefs,
        synced: getState().prefs.synced,
      }),
    );
    return globalPrefs;
  },
);

type SaveGlobalPrefsPayload = {
  prefs: GlobalPrefs;
  onSaveGlobalPrefs?: () => void;
};

export const saveGlobalPrefs = createAppAsyncThunk(
  `${sliceName}/saveGlobalPrefs`,
  async (
    { prefs, onSaveGlobalPrefs }: SaveGlobalPrefsPayload,
    { dispatch },
  ) => {
    await send('save-global-prefs', prefs);
    dispatch(mergeGlobalPrefs(prefs));
    onSaveGlobalPrefs?.();
  },
);

type SaveSyncedPrefsPayload = {
  prefs: SyncedPrefs;
};

export const saveSyncedPrefs = createAppAsyncThunk(
  `${sliceName}/saveSyncedPrefs`,
  async ({ prefs }: SaveSyncedPrefsPayload, { dispatch }) => {
    await Promise.all(
      Object.entries(prefs).map(([prefName, value]) =>
        send('preferences/save', {
          id: prefName as keyof SyncedPrefs,
          value,
        }),
      ),
    );
    dispatch(mergeSyncedPrefs(prefs));
  },
);

type SetPrefsPayload = {
  local: MetadataPrefs;
  global: GlobalPrefs;
  synced: SyncedPrefs;
};

type MergeLocalPrefsPayload = MetadataPrefs;
type MergeGlobalPrefsPayload = GlobalPrefs;
type MergeSyncedPrefsPayload = SyncedPrefs;

const prefsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setPrefs(state, action: PayloadAction<SetPrefsPayload>) {
      state.local = action.payload.local;
      state.global = action.payload.global;
      state.synced = action.payload.synced;
    },
    mergeLocalPrefs(state, action: PayloadAction<MergeLocalPrefsPayload>) {
      state.local = { ...state.local, ...action.payload };
    },
    mergeGlobalPrefs(state, action: PayloadAction<MergeGlobalPrefsPayload>) {
      state.global = { ...state.global, ...action.payload };
    },
    mergeSyncedPrefs(state, action: PayloadAction<MergeSyncedPrefsPayload>) {
      state.synced = { ...state.synced, ...action.payload };
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, state => ({
      ...initialState,
      global: state.global || initialState.global,
    }));
  },
});

export const { name, reducer, getInitialState } = prefsSlice;

export const actions = {
  ...prefsSlice.actions,
  loadPrefs,
  savePrefs,
  loadGlobalPrefs,
  saveGlobalPrefs,
  saveSyncedPrefs,
};

export const { mergeGlobalPrefs, mergeLocalPrefs, mergeSyncedPrefs, setPrefs } =
  actions;
