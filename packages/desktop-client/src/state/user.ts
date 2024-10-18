import { type Handlers } from 'loot-core/types/handlers';

import type { UserActions } from './actions/user';
import * as constants from './constants';

export type UserState = {
  data: Awaited<ReturnType<Handlers['subscribe-get-user']>>;
};

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
