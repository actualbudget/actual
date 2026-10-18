import type { BankingInformation } from 'lib-fints';

import { SecretName, secretsService } from '#services/secrets-service';

/** One bank login. A user typically has one per bank. */
export type FinTSConnection = {
  id: string;
  name: string;
  blz: string;
  url: string;
  userId: string;
  customerId?: string;
  tanMethodId?: number;
  tanMediaName?: string;
  /** Bank and user parameters incl. the system id, reused across sessions. */
  bankingInformation?: BankingInformation;
  /** Only present when the user explicitly chose to store the PIN. */
  pin?: string;
};

export type FinTSConnectionSummary = {
  id: string;
  name: string;
  blz: string;
  url: string;
  userId: string;
  customerId?: string;
  bankName?: string;
  hasStoredPin: boolean;
};

// Connections live in the secrets table, scoped like other bank sync
// credentials: per budget file when a file id is given, globally otherwise.
export type ConnectionScope = string | null;

// The secrets service takes no file id (`undefined`) for global secrets.
function fileIdOf(scope: ConnectionScope): string | undefined {
  return scope ?? undefined;
}

export function loadConnections(scope: ConnectionScope): FinTSConnection[] {
  const raw = secretsService.get(SecretName.fints_connections, fileIdOf(scope));
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    // Written by `saveConnections` below. The generic secrets endpoint can
    // only overwrite it within the same scope, which at worst breaks that
    // scope's own logins.
    return Array.isArray(parsed) ? (parsed as FinTSConnection[]) : [];
  } catch {
    return [];
  }
}

function saveConnections(
  scope: ConnectionScope,
  connections: FinTSConnection[],
) {
  // An empty list is stored as `[]` rather than removed, which reads back
  // the same.
  secretsService.set(
    SecretName.fints_connections,
    JSON.stringify(connections),
    fileIdOf(scope),
  );
}

export function getConnection(
  scope: ConnectionScope,
  connectionId: string,
): FinTSConnection | null {
  return (
    loadConnections(scope).find(connection => connection.id === connectionId) ??
    null
  );
}

/**
 * Inserts or replaces a connection. Synchronous on purpose: the secrets store
 * is synchronous, so the read-modify-write cannot interleave with another
 * request.
 */
export function putConnection(
  scope: ConnectionScope,
  connection: FinTSConnection,
) {
  const connections = loadConnections(scope).filter(
    existing => existing.id !== connection.id,
  );
  saveConnections(scope, [...connections, connection]);
}

export function updateConnection(
  scope: ConnectionScope,
  connectionId: string,
  update: (connection: FinTSConnection) => FinTSConnection,
): FinTSConnection | null {
  const connection = getConnection(scope, connectionId);
  if (!connection) {
    return null;
  }
  const updated = update(connection);
  putConnection(scope, updated);
  return updated;
}

export function removeConnection(
  scope: ConnectionScope,
  connectionId: string,
): boolean {
  const connections = loadConnections(scope);
  const remaining = connections.filter(
    connection => connection.id !== connectionId,
  );
  saveConnections(scope, remaining);
  return remaining.length !== connections.length;
}

export function summarizeConnection(
  connection: FinTSConnection,
): FinTSConnectionSummary {
  return {
    id: connection.id,
    name: connection.name,
    blz: connection.blz,
    url: connection.url,
    userId: connection.userId,
    customerId: connection.customerId,
    bankName: connection.bankingInformation?.bpd?.bankName,
    hasStoredPin: Boolean(connection.pin),
  };
}
