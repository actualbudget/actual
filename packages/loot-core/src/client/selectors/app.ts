import { createSelector } from 'reselect';

import { selectState } from './root';

const selectAppState = createSelector(selectState, state => state.app);

export const selectAppLoadingText = createSelector(
  selectAppState,
  app => app.loadingText,
);

export const selectAppLastSplitState = createSelector(
  selectAppState,
  app => app.lastSplitState,
);

export const selectAppLastUndoState = createSelector(
  selectAppState,
  app => app.lastUndoState,
);

export const selectAppUpdateInfo = createSelector(
  selectAppState,
  app => app.updateInfo,
);

export const selectAppShowUpdateNotification = createSelector(
  selectAppState,
  app => app.showUpdateNotification,
);
