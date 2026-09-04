import { useSyncExternalStore } from 'react';

import { isElectron } from '@actual-app/core/shared/environment';

import {
  backupProviders,
  connectDestination,
  forgetDestination,
  getBackupState,
  getSupportedProviders,
  performBackup,
  reconnectDestination,
  subscribeBackupState,
} from '#backups';
import type {
  BackupDestinationKind,
  BackupProvider,
  BackupState,
} from '#backups';
import { useMetadataPref } from '#hooks/useMetadataPref';

export type UseBackupDestinationResult = BackupState & {
  /** Every provider Actual lists, including ones not available here or yet. */
  providers: BackupProvider[];
  /** Providers that can actually be connected in this browser. */
  supportedProviders: BackupProvider[];
  isSupported: boolean;
  /** Must be called from a user gesture (pickers and sign-in flows need it). */
  connect: (kind: BackupDestinationKind) => Promise<void>;
  /** Must be called from a user gesture (permission prompts need it). */
  reconnect: () => Promise<void>;
  backupNow: () => Promise<void>;
  forget: () => Promise<void>;
};

/**
 * Read and control the automatic backup destination for the open budget.
 */
export function useBackupDestination(): UseBackupDestinationResult {
  const [budgetId] = useMetadataPref('id');
  const [budgetName] = useMetadataPref('budgetName');
  const state = useSyncExternalStore(subscribeBackupState, getBackupState);

  const providers = isElectron() ? [] : backupProviders;
  const supportedProviders = isElectron() ? [] : getSupportedProviders();
  const context = budgetId
    ? { budgetId, budgetName: budgetName ?? 'budget' }
    : null;

  return {
    ...state,
    providers,
    supportedProviders,
    isSupported: supportedProviders.length > 0,
    connect: async kind => {
      if (context) {
        await connectDestination(context, kind);
      }
    },
    reconnect: async () => {
      if (context) {
        await reconnectDestination(context);
      }
    },
    backupNow: async () => {
      if (context) {
        await performBackup(context);
      }
    },
    forget: async () => {
      if (context) {
        await forgetDestination(context);
      }
    },
  };
}
