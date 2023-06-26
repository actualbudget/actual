import * as constants from '../constants';

let initialState = {};

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
