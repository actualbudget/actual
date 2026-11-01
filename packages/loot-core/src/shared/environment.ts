export function isPreviewEnvironment() {
  return String(process.env.REACT_APP_NETLIFY) === 'true';
}

export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === 'development';
}

export function isNonProductionEnvironment() {
  return isPreviewEnvironment() || isDevelopmentEnvironment();
}

export function isElectron() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.indexOf('Electron') >= 0
  ) {
    return true;
  }
  return false;
}

// The Capacitor native apps serve the web build from a custom URL scheme
// (`capacitor://localhost`), which WebKit never treats as cross-origin
// isolated, so SharedArrayBuffer is never available there by design.
export function isCapacitor() {
  return typeof window !== 'undefined' && 'Capacitor' in window;
}
