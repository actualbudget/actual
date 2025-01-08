// @ts-strict-ignore
import { send } from '../../platform/client/fetch';
import { closeBudget, loadBudget } from '../budgets/budgetsSlice';
import { type AppDispatch, type GetRootState } from '../store';

// Take in the budget id so that backups can be loaded when a budget
// isn't opened
export function loadBackup(budgetId, backupId) {
  return async (dispatch: AppDispatch, getState: GetRootState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    await dispatch(loadBudget({ id: budgetId }));
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
