// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import { type AppDispatch, type GetRootState } from '../store';

import { closeBudget, loadBudget } from './budgets';

// Take in the budget id so that backups can be loaded when a budget
// isn't opened
export function loadBackup(budgetId, backupId) {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    await dispatch(loadBudget(budgetId));
  };
}

export function makeBackup() {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await send('backup-make', { id: prefs.id });
    }
  };
}
