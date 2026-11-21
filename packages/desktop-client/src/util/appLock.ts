import { Capacitor, registerPlugin } from '@capacitor/core';

// The biometry the device would offer before falling back to its passcode.
// Android does not say which kind it has, so it reports 'biometrics'.
export type AppLockBiometry =
  | 'faceId'
  | 'touchId'
  | 'opticId'
  | 'biometrics'
  | 'none';

export type AppLockStatus = {
  /** False when the device has no passcode, so there is nothing to ask for. */
  isAvailable: boolean;
  isEnabled: boolean;
  biometry: AppLockBiometry;
};

type AppLockPlugin = {
  getStatus(): Promise<AppLockStatus>;
  setEnabled(options: {
    enabled: boolean;
    reason: string;
  }): Promise<AppLockStatus>;
};

// Implemented natively in the iOS and Android apps (packages/mobile-client),
// which are also what enforce the lock. Nothing else registers the plugin.
const AppLock = registerPlugin<AppLockPlugin>('AppLock');

export function isAppLockSupported() {
  return Capacitor.isPluginAvailable('AppLock');
}

export function getAppLockStatus() {
  return AppLock.getStatus();
}

/**
 * Turns the lock on or off. The system asks the user to authenticate first,
 * showing `reason`; if they cancel, the returned status is unchanged.
 */
export function setAppLockEnabled(enabled: boolean, reason: string) {
  return AppLock.setEnabled({ enabled, reason });
}
