import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { FutureBufferMode } from '@actual-app/core/types/prefs';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';
import { useDispatch } from '#redux';

type UseFutureBufferModeResult = {
  // The selected future buffer mode. Unset preferences default to manual.
  futureBufferMode: FutureBufferMode;
  // Whether the future buffer mode setting should be shown (feature flag on + envelope).
  isFutureBufferModeAvailable: boolean;
  // Whether automatic future buffer mode is currently active.
  isAutomaticFutureBufferMode: boolean;
  // Whether the given month is the current month or a future month.
  isCurrentOrFutureMonth: (month: string) => boolean;
  // Persist the future buffer mode preference via the atomic core action.
  setFutureBufferMode: (mode: FutureBufferMode) => Promise<void>;
};

export function useFutureBufferMode(): UseFutureBufferModeResult {
  const featureFlagEnabled = useFeatureFlag('futureBufferMode');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [futureBufferModePref] = useSyncedPref('futureBufferMode');
  const dispatch = useDispatch();

  const futureBufferMode: FutureBufferMode =
    futureBufferModePref === 'automatic' ? 'automatic' : 'manual';
  const isFutureBufferModeAvailable =
    featureFlagEnabled && budgetType === 'envelope';
  const isAutomaticFutureBufferMode =
    isFutureBufferModeAvailable && futureBufferMode === 'automatic';

  const setFutureBufferMode = async (mode: FutureBufferMode) => {
    await send('budget/set-future-buffer-mode', { mode });
    dispatch(
      mergeSyncedPrefs({
        futureBufferMode: mode,
      }),
    );
  };

  const isCurrentOrFutureMonth = (month: string) =>
    month >= monthUtils.currentMonth();

  return {
    futureBufferMode,
    isFutureBufferModeAvailable,
    isAutomaticFutureBufferMode,
    isCurrentOrFutureMonth,
    setFutureBufferMode,
  };
}
