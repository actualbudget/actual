/** Extensions that open the transaction import modal (need an account). */
export const TRANSACTION_IMPORT_EXTENSIONS = new Set([
  'ofx',
  'qfx',
  'csv',
  'tsv',
  'qif',
  'xml',
]);

/** Extensions that open the Actual budget import flow. */
export const BUDGET_IMPORT_EXTENSIONS = new Set(['zip', 'blob']);

export function getExtensionFromUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const base = pathname.split('/').pop() ?? '';
    const decoded = decodeURIComponent(base);
    const match = /\.([a-z0-9]+)$/i.exec(decoded);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function getFilenameFromUrl(url: string): string {
  try {
    const { pathname } = new URL(url);
    const base = pathname.split('/').pop() ?? 'import';
    return decodeURIComponent(base) || 'import';
  } catch {
    return 'import';
  }
}

export function isFileOpenUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'file:' ||
      // Capacitor may rewrite local document opens through the custom scheme
      // with a path that still looks like a filesystem document.
      (parsed.protocol === 'actualbudget:' &&
        getExtensionFromUrl(url) != null &&
        parsed.pathname !== '/openid-cb')
    );
  } catch {
    return false;
  }
}
