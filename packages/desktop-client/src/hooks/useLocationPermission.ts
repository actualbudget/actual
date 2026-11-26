import { useEffect, useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Capacitor } from '@capacitor/core';

import { locationService } from '#payees/location';
import {
  refreshNativeLocationPermission,
  requestNativeLocationPermission,
  subscribeToNativeLocationPermission,
} from '#payees/native-location-permission';

import { useOnVisible } from './useOnVisible';

const isNativeApp = Capacitor.isNativePlatform();

export type LocationPermission = {
  isGranted: boolean;
  isPending: boolean;
  requestPermission: () => Promise<void>;
};

/**
 * Custom hook to manage geolocation permission status.
 *
 * Payee location functionality is only available on the mobile transaction
 * screen, so permission is only tracked at narrow widths.
 *
 * @returns a LocationPermissions object
 */
export function useLocationPermission(): LocationPermission {
  const { isNarrowWidth } = useResponsive();
  const [state, setState] = useState<PermissionState | null>(null);

  // The operating system does not announce permission changes, so pick up
  // one made in the device settings when the app comes back.
  useOnVisible(() => refreshNativeLocationPermission(), {
    isEnabled: isNativeApp && isNarrowWidth,
  });

  useEffect(() => {
    if (!isNarrowWidth) {
      setState(null);
      return;
    }

    if (isNativeApp) {
      const unsubscribe = subscribeToNativeLocationPermission(setState);
      void refreshNativeLocationPermission();
      return unsubscribe;
    }

    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let isMounted = true;

    // Check if Permissions API is available
    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      setState(null);
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
          // Set initial state
          setState(status.state);

          // Listen for permission changes
          handleChange = () => {
            setState(status.state);
          };

          status.addEventListener('change', handleChange);
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }
          // Permission API not supported, assume no access
          setState(null);
        });
    } catch {
      if (!isMounted) {
        return;
      }
      // Synchronous error (e.g., TypeError), assume no access
      setState(null);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (permissionStatus && handleChange) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, [isNarrowWidth]);

  const requestPermission = async () => {
    if (isNativeApp) {
      await requestNativeLocationPermission();
      return;
    }

    try {
      await locationService.getCurrentPosition();
      setState('granted');
    } catch {
      // Re-query permissions state just in case
      try {
        const status = await navigator.permissions.query({
          name: 'geolocation',
        });
        setState(status.state);
      } catch {
        setState('denied');
      }
    }
  };

  return {
    isGranted: state === 'granted',
    isPending: state === 'prompt',
    requestPermission,
  };
}
