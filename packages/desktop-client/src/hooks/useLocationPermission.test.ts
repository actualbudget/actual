import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { locationService } from '#payees/location';

import { useLocationPermission } from './useLocationPermission';

vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: true }),
}));

vi.mock('#payees/location', () => ({
  locationService: { getCurrentPosition: vi.fn() },
}));

const getCurrentPosition = vi.mocked(locationService.getCurrentPosition);
const position = { latitude: 1, longitude: 2 };

describe('useLocationPermission without a Permissions API', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { ...navigator, permissions: undefined });
    localStorage.clear();
    getCurrentPosition.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers a request instead of treating the unknown status as denied', () => {
    const { result } = renderHook(() => useLocationPermission());

    expect(result.current.isGranted).toBe(false);
    expect(result.current.isPending).toBe(true);
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('grants after a successful request and restores it on the next mount', async () => {
    getCurrentPosition.mockResolvedValue(position);
    const first = renderHook(() => useLocationPermission());

    await act(() => first.result.current.requestPermission());
    expect(first.result.current.isGranted).toBe(true);
    first.unmount();

    const second = renderHook(() => useLocationPermission());
    await waitFor(() => expect(second.result.current.isGranted).toBe(true));
  });

  it('stops restoring once access no longer holds', async () => {
    localStorage.setItem('location-permission-granted', 'true');
    getCurrentPosition.mockRejectedValue(new Error('denied'));

    const { result } = renderHook(() => useLocationPermission());

    await waitFor(() =>
      expect(localStorage.getItem('location-permission-granted')).toBeNull(),
    );
    expect(result.current.isGranted).toBe(false);
    expect(result.current.isPending).toBe(true);
  });

  it('stops offering the request after it is refused', async () => {
    getCurrentPosition.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useLocationPermission());

    await act(() => result.current.requestPermission());

    expect(result.current.isGranted).toBe(false);
    expect(result.current.isPending).toBe(false);
  });
});
