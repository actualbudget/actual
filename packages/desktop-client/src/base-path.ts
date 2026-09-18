/** Normalize a URL prefix for browser routing and asset resolution. */
export function getBasePath(value: string): string {
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function withBasePath(basePath: string, url: string): string {
  return `${getBasePath(basePath)}/${url.replace(/^\/+/, '')}`;
}

export function stripBasePath(basePath: string, pathname: string): string {
  const prefix = getBasePath(basePath);
  if (!prefix) return pathname;
  if (pathname === prefix) return '/';
  return pathname.startsWith(`${prefix}/`)
    ? pathname.slice(prefix.length)
    : pathname;
}
