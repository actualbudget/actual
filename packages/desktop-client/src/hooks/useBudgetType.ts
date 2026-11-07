import type { BudgetType } from '@actual-app/core/server/prefs';

import { useSyncedPref } from './useSyncedPref';

export function useBudgetType(): BudgetType {
  const [budgetType] = useSyncedPref('budgetType');
  return budgetType === 'tracking' ? 'tracking' : 'envelope';
}
