import { createSelector } from 'reselect';

import { selectState } from './root';

const selectAccountState = createSelector(selectState, state => state.account);

export const selectAccountSyncing = createSelector(
  selectAccountState,
  account => account.accountsSyncing,
);

export const selectFailedAccounts = createSelector(
  selectAccountState,
  account => account.failedAccounts,
);
