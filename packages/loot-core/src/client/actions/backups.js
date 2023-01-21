import { closeBudget, loadBudget } from './budgets';
import { send } from '../../platform/client/fetch';

// Take in the budget id so that backups can be loaded when a budget
// isn't opened
export function loadBackup(budgetId, backupId) {
  return async (dispatch, getState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    dispatch(loadBudget(budgetId));
  };
}

export function makeBackup() {
  return async (dispatch, getState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await send('backup-make', { id: prefs.id });
    }
  };
}
