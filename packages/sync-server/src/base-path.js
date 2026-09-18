export function normalizeBasePath(value) {
  const path = value.trim();
  if (!path || path === '/') return '';
  if (
    /\s|[?#]/.test(path) ||
    path.split('/').some(segment => segment === '.' || segment === '..')
  ) {
    throw new Error(`Invalid ACTUAL_BASE_PATH: ${value}`);
  }
  return `/${path.replace(/^\/+|\/+$/g, '')}`;
}
