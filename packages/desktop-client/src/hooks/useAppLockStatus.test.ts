import { renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { getAppLockStatus, isAppLockSupported } from '#util/appLock';

import { useAppLockStatus } from './useAppLockStatus';
import { useFeatureFlag } from './useFeatureFlag';

vi.mock('#util/appLock', () => ({
  isAppLockSupported: vi.fn(),
  getAppLockStatus: vi.fn(),
}));
vi.mock('./useFeatureFlag', () => ({ useFeatureFlag: vi.fn() }));
vi.mock('./useOnVisible', () => ({ useOnVisible: vi.fn() }));

function mockAppLock(isFlagEnabled: boolean, isEnabled: boolean) {
  vi.mocked(useFeatureFlag).mockReturnValue(isFlagEnabled);
  vi.mocked(isAppLockSupported).mockReturnValue(true);
  vi.mocked(getAppLockStatus).mockResolvedValue({
    isAvailable: true,
    isEnabled,
    biometry: 'faceId',
  });
}

describe('useAppLockStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers the lock when the feature flag is on', async () => {
    mockAppLock(true, false);
    const { result } = renderHook(() => useAppLockStatus());
    await waitFor(() => expect(result.current[0]?.isEnabled).toBe(false));
  });

  it('keeps offering a lock that is on when the feature flag is off', async () => {
    mockAppLock(false, true);
    const { result } = renderHook(() => useAppLockStatus());
    await waitFor(() => expect(result.current[0]?.isEnabled).toBe(true));
  });

  it('does not offer the lock when it is off and the feature flag is off', async () => {
    mockAppLock(false, false);
    const { result } = renderHook(() => useAppLockStatus());
    await waitFor(() => expect(getAppLockStatus).toHaveBeenCalled());
    expect(result.current[0]).toBeNull();
  });

  it('does not ask for the status where the lock is not supported', () => {
    mockAppLock(true, true);
    vi.mocked(isAppLockSupported).mockReturnValue(false);
    const { result } = renderHook(() => useAppLockStatus());
    expect(getAppLockStatus).not.toHaveBeenCalled();
    expect(result.current[0]).toBeNull();
  });
});
