import type * as constants from '../constants';

import type { AppActions, AppState } from './app';
import type { BudgetsActions, BudgetsState } from './budgets';
import type { ModalsActions, ModalsState } from './modals';
import type { NotificationsActions, NotificationsState } from './notifications';
import type { PrefsActions, PrefsState } from './prefs';
import type { QueriesActions, QueriesState } from './queries';
import type { UserActions, UserState } from './user';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action =
  | AccountActions
  | AppActions
  | BudgetsActions
  | ModalsActions
  | NotificationsActions
  | PrefsActions
  | QueriesActions
  | UserActions
  | CloseBudgetAction;

export type State = {
  app: AppState;
  budgets: BudgetsState;
  modals: ModalsState;
  notifications: NotificationsState;
  prefs: PrefsState;
  queries: QueriesState;
  user: UserState;
};
