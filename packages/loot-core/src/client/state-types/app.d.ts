import type * as constants from '../constants';

export type AppState = {
  loadingText: string | null;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  } | null;
  showUpdateNotification: boolean;
  managerHasInitialized: boolean;
};

export type SetAppStateAction = {
  type: typeof constants.SET_APP_STATE;
  state: Partial<AppState>;
};

export type AppActions = SetAppStateAction;
