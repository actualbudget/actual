import type * as CapacitorCore from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type * as CapacitorHaptics from '@capacitor/haptics';

const isNativePlatform = vi.hoisted(() => vi.fn(() => false));

vi.mock('@capacitor/core', async importOriginal => {
  const actual = await importOriginal<typeof CapacitorCore>();
  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform },
  };
});

vi.mock('@capacitor/haptics', async importOriginal => {
  const actual = await importOriginal<typeof CapacitorHaptics>();
  return {
    ...actual,
    Haptics: { impact: vi.fn(() => Promise.resolve()) },
  };
});

async function loadHaptics({ isNative }: { isNative: boolean }) {
  vi.resetModules();
  isNativePlatform.mockReturnValue(isNative);
  return import('./haptics');
}

describe('haptics', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses the native haptics engine inside the Capacitor apps', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const { hapticKeyPress, hapticThresholdCrossed } = await loadHaptics({
      isNative: true,
    });

    hapticKeyPress();
    hapticThresholdCrossed();

    expect(Haptics.impact).toHaveBeenNthCalledWith(1, {
      style: ImpactStyle.Light,
    });
    expect(Haptics.impact).toHaveBeenNthCalledWith(2, {
      style: ImpactStyle.Medium,
    });
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('falls back to the Vibration API in browsers that have it', async () => {
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, vibrate });
    const { hapticKeyPress, hapticThresholdCrossed } = await loadHaptics({
      isNative: false,
    });

    hapticKeyPress();
    hapticThresholdCrossed();

    expect(vibrate).toHaveBeenNthCalledWith(1, 3);
    expect(vibrate).toHaveBeenNthCalledWith(2, 10);
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('does nothing in browsers without the Vibration API', async () => {
    vi.stubGlobal('navigator', { userAgent: navigator.userAgent });
    const { hapticKeyPress } = await loadHaptics({ isNative: false });

    expect(() => hapticKeyPress()).not.toThrow();
    expect(Haptics.impact).not.toHaveBeenCalled();
  });

  it('swallows errors from the native haptics engine', async () => {
    vi.mocked(Haptics.impact).mockRejectedValueOnce(new Error('unavailable'));
    const { hapticKeyPress } = await loadHaptics({ isNative: true });

    expect(() => hapticKeyPress()).not.toThrow();
    await vi.waitFor(() => expect(Haptics.impact).toHaveBeenCalledTimes(1));
  });
});
