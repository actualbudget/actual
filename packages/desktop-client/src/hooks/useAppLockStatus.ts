import { useEffect, useState } from 'react';

import { getAppLockStatus, isAppLockSupported } from '#util/appLock';
import type { AppLockStatus } from '#util/appLock';

import { useFeatureFlag } from './useFeatureFlag';
import { useOnVisible } from './useOnVisible';

/**
 * The app lock status, or null where the lock should not be offered. A lock
 * that is already on is offered even with the feature flag off, so that it
 * can always be turned off again.
 */
export function useAppLockStatus() {
  const isFlagEnabled = useFeatureFlag('nativeAppFeatures');
  const isSupported = isAppLockSupported();
  const [status, setStatus] = useState<AppLockStatus | null>(null);

  useEffect(() => {
    if (isSupported) {
      void getAppLockStatus().then(setStatus);
    }
  }, [isSupported]);

  // The device can change the status while the app is away, for example when
  // its passcode is removed.
  useOnVisible(async () => setStatus(await getAppLockStatus()), {
    isEnabled: isSupported,
  });

  const isOffered = status !== null && (isFlagEnabled || status.isEnabled);
  return [isOffered ? status : null, setStatus] as const;
}
