import { Geolocation } from '@capacitor/geolocation';
import type { PermissionStatus } from '@capacitor/geolocation';

// Location permission inside the native (Capacitor) apps. There the location
// comes from the operating system instead of the web view, so the user is
// asked only once: the web view would otherwise add its own prompt on top of
// the system one.

type Listener = (state: PermissionState) => void;

// The operating system has no "permission changed" event, so every place that
// tracks the permission is told when one of them re-reads it.
const listeners = new Set<Listener>();

function toPermissionState(status: PermissionStatus): PermissionState {
  // Android lets the user grant only an approximate location, which is
  // enough for finding nearby payees.
  if (status.location === 'granted' || status.coarseLocation === 'granted') {
    return 'granted';
  }
  if (status.location === 'denied') {
    return 'denied';
  }
  return 'prompt';
}

function notify(state: PermissionState) {
  listeners.forEach(listener => listener(state));
}

export function subscribeToNativeLocationPermission(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Re-reads the permission and tells every subscriber. */
export async function refreshNativeLocationPermission() {
  let state: PermissionState;
  try {
    state = toPermissionState(await Geolocation.checkPermissions());
  } catch {
    // Thrown when location services are switched off for the whole device.
    state = 'denied';
  }
  notify(state);
  return state;
}

/** Shows the system permission prompt and tells every subscriber the answer. */
export async function requestNativeLocationPermission() {
  let state: PermissionState;
  try {
    state = toPermissionState(await Geolocation.requestPermissions());
  } catch {
    state = 'denied';
  }
  notify(state);
  return state;
}

/**
 * True when the user granted an approximate location only, which Android
 * allows. Asking for a precise position then would bring up a second prompt
 * to upgrade the grant.
 */
export async function hasOnlyApproximateNativeLocation() {
  try {
    const status = await Geolocation.checkPermissions();
    return status.coarseLocation === 'granted' && status.location !== 'granted';
  } catch {
    return false;
  }
}
