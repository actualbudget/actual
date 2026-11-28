// Location access for the native (Capacitor) apps. It reads the location
// from the operating system, which asks for permission once: the Web
// Geolocation API would make the web view ask a second time.
import type { LocationCoordinates } from '@actual-app/core/shared/location-utils';
import { Geolocation } from '@capacitor/geolocation';

import { DEFAULT_POSITION_OPTIONS } from './location-adapters';
import type { GeolocationAdapter } from './location-adapters';
import {
  hasOnlyApproximateNativeLocation,
  refreshNativeLocationPermission,
  requestNativeLocationPermission,
  subscribeToNativeLocationPermission,
} from './native-location-permission';

export const geolocationAdapter: GeolocationAdapter = {
  async getCurrentPosition(
    options: PositionOptions = {},
  ): Promise<LocationCoordinates> {
    const isApproximateOnly = await hasOnlyApproximateNativeLocation();
    const position = await Geolocation.getCurrentPosition({
      ...DEFAULT_POSITION_OPTIONS,
      ...options,
      ...(isApproximateOnly && { enableHighAccuracy: false }),
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  },
};

/**
 * Reports the location permission now and whenever it is re-read. Returns a
 * function that stops the reports.
 */
export function watchLocationPermission(
  listener: (state: PermissionState | null) => void,
) {
  const unsubscribe = subscribeToNativeLocationPermission(listener);
  void refreshNativeLocationPermission();
  return unsubscribe;
}

/**
 * The operating system does not announce permission changes, so this picks
 * up one made in the device settings.
 */
export const refreshLocationPermission = refreshNativeLocationPermission;

export const requestLocationPermission = requestNativeLocationPermission;
