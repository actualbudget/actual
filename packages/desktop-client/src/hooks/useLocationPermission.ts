import { useEffect, useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { locationService } from 'loot-core/shared/location';

import { useFeatureFlag } from './useFeatureFlag';

/**
 * Custom hook to manage geolocation permission status
 * Currently behind the payeeLocations feature flag
 *
 * @returns boolean indicating whether geolocation access is granted
 */
export function useLocationPermission(): boolean {
  const payeeLocationsEnabled = useFeatureFlag('payeeLocations');
  const { isNarrowWidth } = useResponsive();
  const [locationAccess, setLocationAccess] = useState(false);

  useEffect(() => {
    if (!payeeLocationsEnabled || !isNarrowWidth) {
      setLocationAccess(false);
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let isMounted = true;

    // Check if Permissions API is available
    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      setLocationAccess(false);
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
          setLocationAccess(status.state === 'granted');

          // Listen for permission changes
          handleChange = () => {
            setLocationAccess(status.state === 'granted');
          };

          status.addEventListener('change', handleChange);

          if (status.state === 'prompt') {
            locationService
              .getCurrentPosition()
              .then(() => {
                if (isMounted) {
                  setLocationAccess(true);
                }
              })
              .catch(() => {
                if (isMounted) {
                  setLocationAccess(false);
                }
              });
          }
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }
          // Permission API not supported, assume no access
          setLocationAccess(false);
        });
    } catch {
      if (!isMounted) {
        return;
      }
      // Synchronous error (e.g., TypeError), assume no access
      setLocationAccess(false);
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (permissionStatus && handleChange) {
        permissionStatus.removeEventListener('change', handleChange);
      }
    };
  }, [payeeLocationsEnabled, isNarrowWidth]);

  return locationAccess;
}
