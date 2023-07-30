import { createSelector } from 'reselect';

import { selectState } from './root';

const selectUserState = createSelector(selectState, state => state.user);

export const selectUserData = createSelector(
  selectUserState,
  user => user.data,
);
