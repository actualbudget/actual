// Location access for the web app, through the browser. The native apps use
// `location-platform.mobile.ts` instead, picked at build time by the `mobile`
// import condition, so that the native plugin stays out of the web bundle.
import { BrowserGeolocationAdapter } from './location-adapters';
import type { GeolocationAdapter } from './location-adapters';

export const geolocationAdapter: GeolocationAdapter =
  new BrowserGeolocationAdapter();

type Listener = (state: PermissionState | null) => void;

async function queryPermission(): Promise<PermissionStatus | null> {
  if (
    !navigator.permissions ||
    typeof navigator.permissions.query !== 'function'
  ) {
    return null;
  }
  try {
    return await navigator.permissions.query({ name: 'geolocation' });
  } catch {
    // Permissions API does not know about geolocation: assume no access.
    return null;
  }
}

/**
 * Reports the location permission now and whenever it changes. Returns a
 * function that stops the reports.
 */
export function watchLocationPermission(listener: Listener) {
  let isWatching = true;
  let stopListening: (() => void) | null = null;

  void queryPermission().then(status => {
    if (!isWatching) {
      return;
    }
    listener(status?.state ?? null);
    if (!status) {
      return;
    }
    const handleChange = () => listener(status.state);
    status.addEventListener('change', handleChange);
    stopListening = () => status.removeEventListener('change', handleChange);
  });

  return () => {
    isWatching = false;
    stopListening?.();
  };
}

/** The browser announces permission changes itself, so nothing to re-read. */
export function refreshLocationPermission(): Promise<void> {
  return Promise.resolve();
}

/**
 * Asks for the location permission. Browsers have no call for that alone, so
 * the prompt is raised by asking for the position.
 */
export async function requestLocationPermission(): Promise<PermissionState> {
  try {
    await geolocationAdapter.getCurrentPosition();
    return 'granted';
  } catch {
    // Re-query the permission state just in case
    const status = await queryPermission();
    return status?.state ?? 'denied';
  }
}
