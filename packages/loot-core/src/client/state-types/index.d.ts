import type * as constants from '../constants';

import type { UserActions, UserState } from './user';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action = UserActions | CloseBudgetAction;

export type State = {
  user: UserState;
};
