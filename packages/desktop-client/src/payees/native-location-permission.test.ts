import { Geolocation } from '@capacitor/geolocation';
import type { PermissionStatus } from '@capacitor/geolocation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  refreshNativeLocationPermission,
  requestNativeLocationPermission,
  subscribeToNativeLocationPermission,
} from './native-location-permission';

// The plugin is a proxy to native code, which does not exist in tests.
vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
}));

function collectStates() {
  const states: PermissionState[] = [];
  const unsubscribe = subscribeToNativeLocationPermission(state =>
    states.push(state),
  );
  return { states, unsubscribe };
}

describe('native location permission', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each<[PermissionStatus, PermissionState]>([
    [{ location: 'granted', coarseLocation: 'granted' }, 'granted'],
    [{ location: 'denied', coarseLocation: 'granted' }, 'granted'],
    [{ location: 'denied', coarseLocation: 'denied' }, 'denied'],
    [{ location: 'prompt', coarseLocation: 'prompt' }, 'prompt'],
    [
      {
        location: 'prompt-with-rationale',
        coarseLocation: 'prompt-with-rationale',
      },
      'prompt',
    ],
  ])('reports %o as %s', async (status, expected) => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(status);
    const { states, unsubscribe } = collectStates();

    await refreshNativeLocationPermission();

    expect(states).toEqual([expected]);
    unsubscribe();
  });

  it('reports denied when location services are switched off', async () => {
    vi.mocked(Geolocation.checkPermissions).mockRejectedValue(
      new Error('Location services are not enabled'),
    );
    const { states, unsubscribe } = collectStates();

    await refreshNativeLocationPermission();

    expect(states).toEqual(['denied']);
    unsubscribe();
  });

  it('tells every subscriber the answer to the permission prompt', async () => {
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({
      location: 'granted',
      coarseLocation: 'granted',
    });
    const first = collectStates();
    const second = collectStates();
    second.unsubscribe();

    await requestNativeLocationPermission();

    expect(first.states).toEqual(['granted']);
    expect(second.states).toEqual([]);
    first.unsubscribe();
  });
});
