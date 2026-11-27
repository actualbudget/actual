import { useEffect, useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import {
  refreshLocationPermission,
  requestLocationPermission,
  watchLocationPermission,
} from '#payees/location-platform';

import { useOnVisible } from './useOnVisible';

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

  // Pick up a permission change made in the device settings when the app
  // comes back.
  useOnVisible(() => refreshLocationPermission(), {
    isEnabled: isNarrowWidth,
  });

  useEffect(() => {
    if (!isNarrowWidth) {
      setState(null);
      return;
    }
    return watchLocationPermission(setState);
  }, [isNarrowWidth]);

  const requestPermission = async () => {
    setState(await requestLocationPermission());
  };

  return {
    isGranted: state === 'granted',
    isPending: state === 'prompt',
    requestPermission,
  };
}
