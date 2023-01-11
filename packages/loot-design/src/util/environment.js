export function isPreviewEnvironment() {
  return String(process.env.REACT_APP_NETLIFY) === 'true';
}

export function isDevelopmentEnvironment() {
  return process.env.NODE_ENV === 'development';
}
