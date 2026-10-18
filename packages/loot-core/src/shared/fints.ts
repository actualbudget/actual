/**
 * Returned by a FinTS sync when the bank login needs the user: a PIN, a TAN
 * or another approval. The client asks for it and syncs the account again.
 */
export const FINTS_AUTH_REQUIRED = 'FINTS_AUTH_REQUIRED';

/**
 * FinTS account ids are `<connectionId>|<account>[|<sub-account>]`, built by
 * the sync server (`app-fints/fints-mapper.ts`).
 */
export function getFinTSConnectionId(accountId: string): string | null {
  const [connectionId] = accountId.split('|');
  return connectionId && connectionId !== accountId ? connectionId : null;
}
