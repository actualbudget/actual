export type ImportAccountHint = {
  source: 'ofx' | 'camt' | 'qif';
  // Normalized identifier the file declares for its account. Not
  // guaranteed to be globally unique across sources.
  id: string;
};

// Uppercase and strip whitespace so cosmetic differences between exports
// of the same account (spacing, case) don't defeat matching.
export function normalizeAccountId(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }
  const normalized = String(value).replace(/\s+/g, '').toUpperCase();
  return normalized === '' ? null : normalized;
}

export function createAccountHint(
  source: ImportAccountHint['source'],
  ...parts: unknown[]
): ImportAccountHint | null {
  const normalized = parts.map(normalizeAccountId);
  if (normalized.every(part => part == null)) {
    return null;
  }
  return { source, id: normalized.map(part => part ?? '').join(':') };
}
