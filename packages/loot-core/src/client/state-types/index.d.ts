import type * as constants from '../constants';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action = CloseBudgetAction;

export type State = unknown;
