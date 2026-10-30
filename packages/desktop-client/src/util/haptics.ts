import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Inside the Capacitor apps the native haptics engine is used. Elsewhere the
// Vibration API is used when the browser has it: iOS Safari does not, so the
// web app stays silent there.
const isNativeApp = Capacitor.isNativePlatform();

function vibrate(durationMs: number) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(durationMs);
  }
}

function runNative(action: () => Promise<void>) {
  // Haptics are a nicety: a device without a haptics engine (or a plugin
  // that failed to load) must never surface an error to the user.
  action().catch(() => undefined);
}

/** A key on an on-screen keypad was pressed. */
export function hapticKeyPress() {
  if (isNativeApp) {
    runNative(() => Haptics.impact({ style: ImpactStyle.Light }));
    return;
  }
  vibrate(3);
}

/**
 * A drag crossed the point at which releasing it takes effect, e.g. a swipe
 * revealing its actions or a pull far enough to refresh.
 */
export function hapticThresholdCrossed() {
  if (isNativeApp) {
    runNative(() => Haptics.impact({ style: ImpactStyle.Medium }));
    return;
  }
  vibrate(10);
}
