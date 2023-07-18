import { send } from '../../platform/client/fetch';

import { closeBudget, loadBudget } from './budgets';
import type { ActionResult } from './types';

// Take in the budget id so that backups can be loaded when a budget
// isn't opened
export function loadBackup(budgetId, backupId): ActionResult {
  return async (dispatch, getState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await dispatch(closeBudget());
    }

    await send('backup-load', { id: budgetId, backupId });
    dispatch(loadBudget(budgetId));
  };
}

export function makeBackup(): ActionResult {
  return async (dispatch, getState) => {
    const prefs = getState().prefs.local;
    if (prefs && prefs.id) {
      await send('backup-make', { id: prefs.id });
    }
  };
}
