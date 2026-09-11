import type { BackupDestinationKind, BackupProvider } from '#backups/types';

import { folderProvider } from './folder';
import { googleDriveProvider } from './googleDrive';

/**
 * Every provider Actual knows about, in the order the UI lists them. This
 * includes providers that are not available yet; use
 * `getSupportedProviders` for the ones that can actually be connected.
 */
export const backupProviders: BackupProvider[] = [
  folderProvider,
  googleDriveProvider,
];

/** Providers that are implemented and usable in this browser. */
export function getSupportedProviders(): BackupProvider[] {
  return backupProviders.filter(
    provider => provider.availability === 'available' && provider.isSupported(),
  );
}

export function getProvider(
  kind: BackupDestinationKind,
): BackupProvider | null {
  return backupProviders.find(provider => provider.kind === kind) ?? null;
}
