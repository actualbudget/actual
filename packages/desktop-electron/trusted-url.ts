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
