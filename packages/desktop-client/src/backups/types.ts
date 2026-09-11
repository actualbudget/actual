import type { BackupEntry } from '@actual-app/core/shared/backups';

/** Where backups can be written. Add cloud providers here as they land. */
export type BackupDestinationKind = 'folder' | 'google-drive';

/**
 * Whether Actual has implemented a provider at all. Providers marked
 * `coming-soon` are listed in the UI so people know what is planned, but
 * can never be connected.
 */
export type BackupProviderAvailability = 'available' | 'coming-soon';

export type BackupDestinationStatus =
  /** Access is granted; backups can be written silently. */
  | 'ready'
  /** Access lapsed (new session, revoked token, ...); `reconnect` from a click. */
  | 'needs-reconnect'
  /** The user refused access; they have to connect again from scratch. */
  | 'denied';

export type BackupProviderContext = {
  budgetId: string;
  budgetName: string;
};

/**
 * A connected place to write backups to. Implementations own the transport
 * only: no persistence, no UI strings, no scheduling.
 */
export type BackupDestination = {
  kind: BackupDestinationKind;
  /** Human-readable label: folder name, account email, ... */
  label: string;
  getStatus(): Promise<BackupDestinationStatus>;
  /** Re-acquires access. Must be called from a user gesture. */
  reconnect(): Promise<BackupDestinationStatus>;
  write(name: string, data: Uint8Array): Promise<void>;
  list(): Promise<BackupEntry[]>;
  remove(id: string): Promise<void>;
};

export type ConnectedDestination = {
  destination: BackupDestination;
  /**
   * Structured-cloneable data that lets `restore` rebuild the destination
   * in a later session (a directory handle, tokens, an account id, ...).
   */
  payload: unknown;
};

export type BackupProvider = {
  kind: BackupDestinationKind;
  availability: BackupProviderAvailability;
  /** Whether this browser can use the provider. */
  isSupported(): boolean;
  /**
   * Opens the provider's picker or sign-in flow. Must be called from a user
   * gesture. Resolves to null when the user cancels.
   */
  connect(context: BackupProviderContext): Promise<ConnectedDestination | null>;
  /** Rebuilds a destination from a stored payload; null if it is unusable. */
  restore(
    payload: unknown,
    context: BackupProviderContext,
  ): Promise<BackupDestination | null>;
};

export type BackupWriteResult =
  | { ok: true; warnings: string[] }
  | {
      ok: false;
      reason: 'export-failed' | 'access-lost' | 'write-failed';
      error?: unknown;
    };

const ACCESS_LOST_ERROR_NAME = 'BackupAccessLostError';

/** Thrown by destinations when the user's access has been revoked. */
export function createAccessLostError(cause?: unknown): Error {
  const error = new Error('Access to the backup destination was lost', {
    cause,
  });
  error.name = ACCESS_LOST_ERROR_NAME;
  return error;
}

export function isAccessLostError(error: unknown): boolean {
  return error instanceof Error && error.name === ACCESS_LOST_ERROR_NAME;
}
