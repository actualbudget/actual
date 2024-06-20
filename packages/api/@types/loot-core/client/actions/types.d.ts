import type { ThunkDispatch } from 'redux-thunk';

import type { State, Action } from '../state-types';

export type Dispatch = ThunkDispatch<State, never, Action>;
export type GetState = () => State;
