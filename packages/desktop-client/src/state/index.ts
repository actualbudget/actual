import type { ThunkDispatch } from 'redux-thunk';

import { update as account, type AccountState } from './account';
import { type Action } from './actions';
import { update as app, type AppState } from './app';
import { update as budgets, type BudgetsState } from './budgets';
import { update as modals, type ModalsState } from './modals';
import {
  update as notifications,
  type NotificationsState,
} from './notifications';
import { update as prefs, type PrefsState } from './prefs';
import { update as queries, type QueriesState } from './queries';
import { update as user, type UserState } from './user';

export type State = {
  account: AccountState;
  app: AppState;
  budgets: BudgetsState;
  modals: ModalsState;
  notifications: NotificationsState;
  prefs: PrefsState;
  queries: QueriesState;
  user: UserState;
};

export type Dispatch = ThunkDispatch<State, never, Action>;
export type GetState = () => State;

export const reducers = {
  app,
  queries,
  account,
  prefs,
  modals,
  notifications,
  budgets,
  user,
};
