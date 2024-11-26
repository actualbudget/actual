/* eslint-disable import/no-unused-modules */

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
  if (navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  return false;
}
