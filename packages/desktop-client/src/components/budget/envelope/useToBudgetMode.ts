import * as monthUtils from '@actual-app/core/shared/months';

import { useSheetName } from '#hooks/useSheetName';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Binding } from '#spreadsheet';
import { envelopeBudget } from '#spreadsheet/bindings';

export function getToBudgetMode(
  mode: string | undefined,
  viewedMonth: string,
  currentMonth: string,
) {
  const includesFutureAssignments =
    mode === 'include-future' && viewedMonth >= currentMonth;
  const binding: Binding<'envelope-budget', 'to-budget' | 'ready-to-assign'> =
    includesFutureAssignments
      ? envelopeBudget.toBudgetWithFuture
      : envelopeBudget.toBudget;

  return {
    includesFutureAssignments,
    toBudgetBinding: binding,
  };
}

export function useToBudgetMode(viewedMonth?: string) {
  const [mode] = useSyncedPref('toBudgetMode');
  const { sheetName } = useSheetName<'envelope-budget', 'to-budget'>(
    envelopeBudget.toBudget,
  );
  const currentMonth = monthUtils.currentMonth();
  const contextMonth = viewedMonth ?? monthUtils.monthFromSheet(sheetName);

  return getToBudgetMode(mode, contextMonth ?? currentMonth, currentMonth);
}
