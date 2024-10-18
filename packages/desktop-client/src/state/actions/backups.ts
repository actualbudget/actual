// @ts-strict-ignore
import { send } from 'loot-core/src/platform/client/fetch';

import type { Dispatch, GetState } from '..';

import { closeBudget, loadBudget } from './budgets';

// Take in the budget id so that backups can be loaded when a budget
// isn't opened
export function loadBackup(budgetId, backupId) {
  return async (dispatch: Dispatch, getState: GetState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    await dispatch(loadBudget(budgetId));
  };
}

export function makeBackup() {
  return async (dispatch: Dispatch, getState: GetState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await send('backup-make', { id: prefs.id });
    }
  };
}
