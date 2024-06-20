import type { UndoState } from '../../server/undo';
import type * as constants from '../constants';

export type SplitState = { ids: Set<string>; mode: 'collapse' | 'expand' };

export type AppState = {
  loadingText: string | null;
  updateInfo: {
    version: string;
    releaseDate: string;
    releaseNotes: string;
  } | null;
  showUpdateNotification: boolean;
  managerHasInitialized: boolean;
  lastUndoState: { current: UndoState | null };
  lastSplitState: { current: SplitState | null };
};

export type SetAppStateAction = {
  type: typeof constants.SET_APP_STATE;
  state: Partial<AppState>;
};

export type SetLastUndoStateAction = {
  type: typeof constants.SET_LAST_UNDO_STATE;
  undoState: UndoState | null;
};

export type SetLastSplitStateAction = {
  type: typeof constants.SET_LAST_SPLIT_STATE;
  splitState: SplitState | null;
};

export type AppActions =
  | SetAppStateAction
  | SetLastUndoStateAction
  | SetLastSplitStateAction;
