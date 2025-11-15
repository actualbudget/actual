import { useState, useEffect } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { locationService } from 'loot-core/shared/location';

/**
 * Custom hook to manage geolocation permission status
 *
 * @returns boolean indicating whether geolocation access is granted
 */
export function useLocationPermission(): boolean {
  const { isNarrowWidth } = useResponsive();
  const [locationAccess, setLocationAccess] = useState(false);

  useEffect(() => {
    if (!isNarrowWidth) {
      return;
    }

    let permissionStatus: PermissionStatus | null = null;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then(status => {
        permissionStatus = status;

        // Set initial state
        setLocationAccess(status.state === 'granted');

        // Listen for permission changes
        const handleChange = () => {
          setLocationAccess(status.state === 'granted');
        };

        status.addEventListener('change', handleChange);

        if (status.state === 'prompt') {
          locationService.getCurrentPosition();
        }
      })
      .catch(() => {
        // Permission API not supported, assume no access
        setLocationAccess(false);
      });

    // Cleanup function
    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener('change', () => {
          setLocationAccess(permissionStatus!.state === 'granted');
        });
      }
    };
  }, [isNarrowWidth]);

  return locationAccess;
}
