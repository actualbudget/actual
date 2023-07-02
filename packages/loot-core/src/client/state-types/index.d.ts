import type * as constants from '../constants';

import type { AccountActions, AccountState } from './account';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action = AccountActions | CloseBudgetAction;

export type State = {
  account: AccountState;
};

declare module 'react-redux' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface, import/no-unused-modules
  export interface DefaultRootState extends State {}
}
