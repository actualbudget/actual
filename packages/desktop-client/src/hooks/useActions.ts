import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { bindActionCreators } from 'redux';
import { type ThunkAction } from 'redux-thunk';

import * as actions from 'loot-core/src/client/actions';
import type { Action, State } from 'loot-core/src/client/state-types';

type ActionReturnType<T extends (...args: unknown[]) => unknown> =
  ReturnType<T> extends ThunkAction<infer ReturnType, State, never, Action>
    ? ReturnType
    : ReturnType<T>;

type BoundActions = {
  [Key in keyof typeof actions]: (
    ...args: Parameters<(typeof actions)[Key]>
  ) => ActionReturnType<(typeof actions)[Key]>;
};

// https://react-redux.js.org/api/hooks#recipe-useactions
export function useActions() {
  const dispatch = useDispatch();
  return useMemo(() => {
    return bindActionCreators(actions, dispatch);
  }, [dispatch]) as unknown as BoundActions;
}
