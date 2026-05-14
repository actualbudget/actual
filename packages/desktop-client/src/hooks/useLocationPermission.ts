import { useCallback, useEffect, useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { locationService } from '#payees/location';

import { useFeatureFlag } from './useFeatureFlag';

export type LocationPermissionState =
  | 'granted'
  | 'prompt'
  | 'denied'
  | 'unavailable';

export type UseLocationPermissionResult = {
  state: LocationPermissionState;
  granted: boolean;
  request: () => Promise<boolean>;
};

/**
 * Custom hook to manage geolocation permission status.
 * Behind the payeeLocations feature flag.
 *
 * This hook does NOT trigger a geolocation prompt on mount. Browsers like
 * iOS Safari don't always persist the grant across sessions, so prompting
 * eagerly causes the dialog to appear on every page open even after the
 * user has tapped "Allow". Callers should invoke `request()` in response
 * to a user gesture (e.g. tapping an "Enable nearby payees" button) so the
 * OS dialog appears at a moment the user expects it.
 */
export function useLocationPermission(): UseLocationPermissionResult {
  const payeeLocationsEnabled = useFeatureFlag('payeeLocations');
  const { isNarrowWidth } = useResponsive();
  const [state, setState] = useState<LocationPermissionState>('unavailable');

  useEffect(() => {
    if (!payeeLocationsEnabled || !isNarrowWidth) {
      setState('unavailable');
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let isMounted = true;

    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      setState('unavailable');
      return;
    }

    try {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then(status => {
          if (!isMounted) {
            return;
          }

          permissionStatus = status;
          setState(status.state);

          handleChange = () => {
            setState(status.state);
          };

          status.addEventListener('change', handleChange);
        })
        .catch(() => {
          if (isMounted) {
            setState('unavailable');
          }
        });
    } catch {
      if (isMounted) {
        setState('unavailable');
      }
    }

    return () => {
      isMounted = false;
      if (permissionStatus && handleChange) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, [payeeLocationsEnabled, isNarrowWidth]);

  const request = useCallback(async () => {
    if (!payeeLocationsEnabled || !isNarrowWidth) {
      return false;
    }
    try {
      await locationService.getCurrentPosition();
      setState('granted');
      return true;
    } catch {
      // The Permissions API change listener will reconcile to the real
      // state (denied, or back to prompt if the user dismissed). Default
      // to denied so we don't keep showing an "Enable" affordance after
      // a failed attempt in this session.
      setState('denied');
      return false;
    }
  }, [payeeLocationsEnabled, isNarrowWidth]);

  return {
    state,
    granted: state === 'granted',
    request,
  };
}
