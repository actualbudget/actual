import * as constants from '../constants';

let initialState = {
  data: null,
};

export default function update(state = initialState, action) {
  switch (action.type) {
    case constants.GET_USER_DATA:
      return { ...state, data: action.data };
    default:
  }

  return state;
}
