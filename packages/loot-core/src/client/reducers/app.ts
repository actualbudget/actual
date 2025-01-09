import * as constants from '../constants';
import type { Action } from '../state-types';
import type { AppState } from '../state-types/app';

export const initialState: AppState = {
  loadingText: null,
  updateInfo: null,
  showUpdateNotification: true,
  managerHasInitialized: false,
};

export function update(state = initialState, action: Action): AppState {
  switch (action.type) {
    case constants.SET_APP_STATE:
      return {
        ...state,
        ...action.state,
      };
    default:
  }
  return state;
}
