import { useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { bindActionCreators } from 'redux';
import { type ThunkAction } from 'redux-thunk';

import type { State } from '../state';
import * as actions from '../state/actions';

type ActionReturnType<T extends (...args: unknown[]) => unknown> =
  ReturnType<T> extends ThunkAction<
    infer ReturnType,
    State,
    never,
    actions.Action
  >
    ? ReturnType
    : ReturnType<T>;

export type BoundActions = {
  [Key in keyof typeof actions]: (
    ...args: Parameters<(typeof actions)[Key]>
  ) => // @ts-expect-error temporarily disabling this TS error; eventually the `useActions` hook should be removed
  ActionReturnType<(typeof actions)[Key]>;
};

// https://react-redux.js.org/api/hooks#recipe-useactions
/**
 * @deprecated please use actions directly with `useDispatch`
 * @see https://github.com/reduxjs/react-redux/issues/1252#issuecomment-488160930
 **/
export function useActions() {
  const dispatch = useDispatch();
  return useMemo(() => {
    return bindActionCreators(actions, dispatch);
  }, [dispatch]) as unknown as BoundActions;
}
