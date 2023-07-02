import type * as constants from '../constants';

import type { AccountActions, AccountState } from './account';
import type { AppActions, AppState } from './app';
import type { BudgetsActions, BudgetsState } from './budgets';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action =
  | AccountActions
  | AppActions
  | BudgetsActions
  | CloseBudgetAction;

export type State = {
  account: AccountState;
  app: AppState;
  budgets: BudgetsState;
};

declare module 'react-redux' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface, import/no-unused-modules
  export interface DefaultRootState extends State {}
}
