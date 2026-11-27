import type { PermissionStatus } from '@capacitor/geolocation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as NativeLocationPermission from './native-location-permission';

// The plugin is a proxy to native code, which does not exist in tests.
const Geolocation = vi.hoisted(() => ({
  checkPermissions: vi.fn<() => Promise<PermissionStatus>>(),
  requestPermissions: vi.fn<() => Promise<PermissionStatus>>(),
}));

vi.mock('@capacitor/geolocation', () => ({ Geolocation }));

// The test setup has already loaded the module with the real plugin, so it
// is loaded again for each test to pick up the mocked one.
let permission: typeof NativeLocationPermission;

function collectStates() {
  const states: PermissionState[] = [];
  const unsubscribe = permission.subscribeToNativeLocationPermission(state =>
    states.push(state),
  );
  return { states, unsubscribe };
}

describe('native location permission', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.resetModules();
    permission = await import('./native-location-permission');
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
    Geolocation.checkPermissions.mockResolvedValue(status);
    const { states, unsubscribe } = collectStates();

    await permission.refreshNativeLocationPermission();

    expect(states).toEqual([expected]);
    unsubscribe();
  });

  it('reports denied when location services are switched off', async () => {
    Geolocation.checkPermissions.mockRejectedValue(
      new Error('Location services are not enabled'),
    );
    const { states, unsubscribe } = collectStates();

    await permission.refreshNativeLocationPermission();

    expect(states).toEqual(['denied']);
    unsubscribe();
  });

  it('tells every subscriber the answer to the permission prompt', async () => {
    Geolocation.requestPermissions.mockResolvedValue({
      location: 'granted',
      coarseLocation: 'granted',
    });
    const first = collectStates();
    const second = collectStates();
    second.unsubscribe();

    await permission.requestNativeLocationPermission();

    expect(first.states).toEqual(['granted']);
    expect(second.states).toEqual([]);
    first.unsubscribe();
  });

  it.each<[PermissionStatus, boolean]>([
    [{ location: 'granted', coarseLocation: 'granted' }, false],
    [{ location: 'denied', coarseLocation: 'granted' }, true],
    [{ location: 'prompt', coarseLocation: 'prompt' }, false],
  ])('detects an approximate-only grant for %o', async (status, expected) => {
    Geolocation.checkPermissions.mockResolvedValue(status);

    expect(await permission.hasOnlyApproximateNativeLocation()).toBe(expected);
  });
});
