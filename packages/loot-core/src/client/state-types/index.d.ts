import type * as constants from '../constants';

export type CloseBudgetAction = {
  type: typeof constants.CLOSE_BUDGET;
};

export type Action = CloseBudgetAction;

export type State = {};
declare module 'react-redux' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-empty-interface, import/no-unused-modules
  export interface DefaultRootState extends State {}
}
