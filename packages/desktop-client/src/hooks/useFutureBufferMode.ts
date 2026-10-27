import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetName } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { envelopeBudget } from '#spreadsheet/bindings';

export type FutureBufferMode = 'manual' | 'automatic';

// Automatic mode sets the buffer of a managed month: one from the start month
// on that isn't frozen. Same rule as the server guard and `buffered-selected`.
export function isManagedMonth(
  startMonth: string | null | undefined,
  month: string | null | undefined,
  frozen: number | null | undefined,
): boolean {
  if (!startMonth || !month || month < startMonth) {
    return false;
  }
  return frozen !== 1;
}

type UseFutureBufferModeResult = {
  mode: FutureBufferMode;
  // Automatic mode owns this month's buffer: manual hold controls and the
  // income auto-hold are hidden.
  isManagedMonth: boolean;
  // The month's buffer is fixed. Holds work by hand, but auto-hold is gone.
  isFrozenMonth: boolean;
  // Whether the To Budget menu offers the mode switch. Once the mode is on
  // it stays available, so it can be turned off after the flag is.
  canChangeMode: boolean;
  setFutureBufferMode: (mode: FutureBufferMode) => Promise<unknown>;
};

// Reads the mode from the sheet rather than the synced prefs: a preference
// written on another device doesn't reach redux, but the cells do.
export function useFutureBufferMode(month?: string): UseFutureBufferModeResult {
  const isFlagEnabled = useFeatureFlag('futureBufferMode');
  const { sheetName } = useSheetName<'envelope-budget', 'frozen'>(
    envelopeBudget.frozen,
  );
  const startMonth =
    useSheetValue<'envelope-budget', '__global!future-buffer-start'>(
      envelopeBudget.futureBufferStart,
    ) || '';
  const frozen = useSheetValue<'envelope-budget', 'frozen'>(
    envelopeBudget.frozen,
  );

  const mode: FutureBufferMode = startMonth ? 'automatic' : 'manual';
  const contextMonth = month ?? monthUtils.monthFromSheet(sheetName);

  return {
    mode,
    isManagedMonth: isManagedMonth(startMonth, contextMonth, frozen),
    isFrozenMonth: frozen === 1,
    canChangeMode: mode === 'automatic' || isFlagEnabled,
    setFutureBufferMode: mode =>
      send('budget/set-future-buffer-mode', { mode }),
  };
}
