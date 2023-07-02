import type * as constants from '../constants';

import type { AccountActions, AccountState } from './account';
import type { AppActions, AppState } from './app';
import type { BudgetsActions, BudgetsState } from './budgets';
import type { ModalsActions, ModalsState } from './modals';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action =
  | AccountActions
  | AppActions
  | BudgetsActions
  | ModalsActions
  | CloseBudgetAction;

export type State = {
  account: AccountState;
  app: AppState;
  budgets: BudgetsState;
  modals: ModalsState;
};

declare module 'react-redux' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface, import/no-unused-modules
  export interface DefaultRootState extends State {}
}
