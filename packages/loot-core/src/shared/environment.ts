export function isEdgeEnvironment() {
  return String(process.env.REACT_APP_NETLIFY) === 'true';
}

export function isPreviewEnvironment() {
  return !!process.env.REACT_APP_REVIEW_ID;
}

export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === 'development';
}

export function isNonProductionEnvironment() {
  return (
    isEdgeEnvironment() || isPreviewEnvironment() || isDevelopmentEnvironment()
  );
}

export function isElectron() {
  if (navigator.userAgent.indexOf('Electron') >= 0) {
    return true;
  }
  return false;
}
