import * as constants from '../constants';
import type { Action } from '../state-types';
import type { ModalsState } from '../state-types/modals';

const initialState: ModalsState = {
  modalStack: [],
  isHidden: false,
};

export function update(state = initialState, action: Action): ModalsState {
  switch (action.type) {
    case constants.PUSH_MODAL:
      return {
        ...state,
        modalStack: [...state.modalStack, action.modal],
      };
    case constants.REPLACE_MODAL:
      return {
        ...state,
        modalStack: [action.modal],
      };
    case constants.POP_MODAL:
      return { ...state, modalStack: state.modalStack.slice(0, -1) };
    case constants.CLOSE_MODAL:
      return {
        ...state,
        modalStack: [],
      };
    case constants.COLLAPSE_MODALS:
      const idx = state.modalStack.findIndex(
        m => m.name === action.rootModalName,
      );
      return {
        ...state,
        modalStack: idx < 0 ? state.modalStack : state.modalStack.slice(0, idx),
      };
    case constants.SET_APP_STATE:
      if ('loadingText' in action.state) {
        return {
          ...state,
          isHidden: action.state.loadingText != null,
        };
      }
      break;
    case constants.SIGN_OUT:
      return initialState;
    default:
  }

  return state;
}
