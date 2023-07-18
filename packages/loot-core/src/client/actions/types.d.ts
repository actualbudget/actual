import type { ThunkDispatch } from 'redux-thunk';

import type { Action, State } from '../state-types';

export type ActionResult = Parameters<
  ThunkDispatch<State, Record<string, never>, Action>
>[0];
