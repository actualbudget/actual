import * as constants from '../constants';

const initialState = {};

export default function update(state = initialState, action) {
  switch (action.type) {
    case constants.SET_PROFILE:
      return {
        ...state,
        ...action.profile,
      };
    default:
  }
  return state;
}
