import * as constants from '../constants';

const initialState = {
  modalStack: [],
  isHidden: false,
};

function update(state = initialState, action) {
  switch (action.type) {
    case constants.PUSH_MODAL:
      return {
        ...state,
        modalStack: [
          ...state.modalStack,
          { name: action.name, options: action.options },
        ],
      };
    case constants.REPLACE_MODAL:
      return {
        ...state,
        modalStack: [{ name: action.name, options: action.options }],
      };
    case constants.POP_MODAL:
      return { ...state, modalStack: state.modalStack.slice(0, -1) };
    case constants.CLOSE_MODAL:
      return { ...state, modalStack: [] };
    case constants.HIDE_MODALS:
      return { ...state, isHidden: true };
    case constants.SHOW_MODALS:
      return { ...state, isHidden: false };
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

export default update;
