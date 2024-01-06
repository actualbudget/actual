import * as constants from '../constants';
import type { UserActions, UserState } from '../state-types/user';

const initialState: UserState = {
  data: null,
};

export function update(state = initialState, action: UserActions): UserState {
  switch (action.type) {
    case constants.GET_USER_DATA:
      return { ...state, data: action.data };
    default:
  }

  return state;
}
