import { createSelector } from 'reselect';

import { selectState } from './root';

const selectQueriesState = createSelector(selectState, state => state.queries);

export const selectSavedQueries = createSelector(
  selectQueriesState,
  queries => queries.saved,
);

export const selectGroupedCategoryQueries = createSelector(
  selectQueriesState,
  queries => queries.categories.grouped,
);

export const selectPayeeQueries = createSelector(
  selectQueriesState,
  queries => queries.payees,
);

export const selectCategoryListQueries = createSelector(
  selectQueriesState,
  queries => queries.categories.list,
);

export const selectAccountQueries = createSelector(
  selectQueriesState,
  queries => queries.accounts,
);

export const selectUpdatedAccountQueries = createSelector(
  selectQueriesState,
  queries => queries.updatedAccounts,
);

export const selectNewTransactionQueries = createSelector(
  selectQueriesState,
  queries => queries.newTransactions,
);
