export function isInternalUrl(value: string, isDev: boolean): boolean {
  try {
    const url = new URL(value);
    if (url.username || url.password) {
      return false;
    }
    return (
      (url.protocol === 'app:' && url.hostname === 'actual' && !url.port) ||
      (isDev && url.origin === 'http://localhost:3001')
    );
  } catch {
    return false;
  }
}

// Permissions the app's own pages may use. Copying to the clipboard (e.g. the
// MCP server's access token in Settings) needs `clipboard-sanitized-write`.
const INTERNAL_PAGE_PERMISSIONS = new Set(['clipboard-sanitized-write']);

export function isPermissionAllowed(
  permission: string,
  url: string,
  isDev: boolean,
): boolean {
  if (url.startsWith('file://')) {
    return true;
  }
  return INTERNAL_PAGE_PERMISSIONS.has(permission) && isInternalUrl(url, isDev);
}
