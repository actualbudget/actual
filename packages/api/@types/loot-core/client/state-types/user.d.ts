import type { Handlers } from '../../types/handlers';
import type * as constants from '../constants';

export type UserState = {
  data: Awaited<ReturnType<Handlers['subscribe-get-user']>>;
};

export type GetUserDataAction = {
  type: typeof constants.GET_USER_DATA;
  data: State['data'];
};

export type UserActions = GetUserDataAction;
