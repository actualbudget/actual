import type * as constants from '../constants';

import type { PrefsActions, PrefsState } from './prefs';
import type { UserActions, UserState } from './user';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action = PrefsActions | UserActions | CloseBudgetAction;

export type State = {
  prefs: PrefsState;
  user: UserState;
};
