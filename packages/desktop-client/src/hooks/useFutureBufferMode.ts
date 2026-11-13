import { send } from '@actual-app/core/platform/client/connection';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetValue } from '#hooks/useSheetValue';
import { envelopeBudget } from '#spreadsheet/bindings';

export type FutureBufferMode = 'manual' | 'automatic';

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

// Reads the mode and the current sheet's month state from the spreadsheet
// rather than the synced prefs: a preference written on another device
// doesn't reach redux, but the cells do.
export function useFutureBufferMode(): UseFutureBufferModeResult {
  const isFlagEnabled = useFeatureFlag('futureBufferMode');
  const startMonth = useSheetValue<
    'envelope-budget',
    '__global!future-buffer-start'
  >(envelopeBudget.futureBufferStart);
  const isManagedMonth =
    useSheetValue<'envelope-budget', 'buffered-managed'>(
      envelopeBudget.managed,
    ) === true;
  const isFrozenMonth =
    useSheetValue<'envelope-budget', 'frozen'>(envelopeBudget.frozen) === true;

  const mode: FutureBufferMode = startMonth ? 'automatic' : 'manual';

  return {
    mode,
    isManagedMonth,
    isFrozenMonth,
    canChangeMode: mode === 'automatic' || isFlagEnabled,
    setFutureBufferMode: mode =>
      send('budget/set-future-buffer-mode', { mode }),
  };
}
