import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { useSyncedPref } from './useSyncedPref';

export function useBudgetBindings() {
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  return budgetType === 'tracking' ? trackingBudget : envelopeBudget;
}
