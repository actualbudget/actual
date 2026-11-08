import { useEffect, useState } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { locationService } from '#payees/location';

// Set when a location request succeeds, so a WebView that cannot query the
// permission status can restore location use on a later launch.
const GRANTED_KEY = 'location-permission-granted';

function readGrantedFlag() {
  try {
    return localStorage.getItem(GRANTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeGrantedFlag(granted: boolean) {
  try {
    if (granted) {
      localStorage.setItem(GRANTED_KEY, 'true');
    } else {
      localStorage.removeItem(GRANTED_KEY);
    }
  } catch {
    // Storage unavailable, nothing to persist
  }
}

type PermissionStatusState = PermissionState | 'unknown';

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
  const [state, setState] = useState<PermissionStatusState | null>(null);

  useEffect(() => {
    if (!isNarrowWidth) {
      setState(null);
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    let handleChange: (() => void) | null = null;
    let isMounted = true;

    // The status cannot be queried (some WebViews), so allow a fresh request,
    // and if an earlier request succeeded, check that access still holds.
    const handleUnknownStatus = () => {
      setState('unknown');
      if (!readGrantedFlag()) {
        return;
      }
      locationService.getCurrentPosition().then(
        () => {
          if (isMounted) {
            setState('granted');
          }
        },
        () => {
          writeGrantedFlag(false);
        },
      );
    };

    if (
      !navigator.permissions ||
      typeof navigator.permissions.query !== 'function'
    ) {
      handleUnknownStatus();
      return () => {
        isMounted = false;
      };
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
          handleUnknownStatus();
        });
    } catch {
      if (!isMounted) {
        return;
      }
      handleUnknownStatus();
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
    try {
      await locationService.getCurrentPosition();
      writeGrantedFlag(true);
      setState('granted');
    } catch {
      writeGrantedFlag(false);
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
    isPending: state === 'prompt' || state === 'unknown',
    requestPermission,
  };
}
