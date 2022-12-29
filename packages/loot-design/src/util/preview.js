export function isPreviewDeployment() {
  return String(process.env.REACT_APP_NETLIFY) === 'true';
}
