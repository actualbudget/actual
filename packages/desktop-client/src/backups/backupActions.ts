// State-aware actions for the backup feature. These update the external
// store, persist the chosen destination, and tell other tabs to refresh.

import {
  getBackupState,
  getLastBackupAt,
  resetBackupState,
  setBackupState,
  setLastBackupAt,
} from './backupState';
import {
  deleteBackupDestinationRecord,
  getBackupDestinationRecord,
  setBackupDestinationRecord,
} from './destinationStore';
import { runBackupTo } from './pipeline';
import { getProvider } from './providers';
import type {
  BackupDestinationKind,
  BackupProviderContext,
  BackupWriteResult,
} from './types';

const CHANNEL_NAME = 'actual-backups';

type ChannelMessage = { type: 'changed'; budgetId: string };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

function notifyOtherTabs(budgetId: string) {
  getChannel()?.postMessage({
    type: 'changed',
    budgetId,
  } satisfies ChannelMessage);
}

/**
 * Re-reads the store when another tab changes the destination or writes a
 * backup. Returns an unsubscribe function.
 */
export function listenForBackupChanges(
  budgetId: string,
  onChange: () => void,
): () => void {
  const activeChannel = getChannel();
  if (!activeChannel) {
    return () => undefined;
  }
  const handler = (event: MessageEvent<ChannelMessage>) => {
    if (event.data?.type === 'changed' && event.data.budgetId === budgetId) {
      onChange();
    }
  };
  activeChannel.addEventListener('message', handler);
  return () => activeChannel.removeEventListener('message', handler);
}

function toIsoString(time: number | null): string | null {
  return time === null ? null : new Date(time).toISOString();
}

export async function loadBackupState(
  context: BackupProviderContext,
): Promise<void> {
  const { budgetId } = context;
  const record = await getBackupDestinationRecord(budgetId);
  const provider = record ? getProvider(record.kind) : null;
  const destination =
    record && provider?.isSupported()
      ? await provider.restore(record.payload, context)
      : null;

  setBackupState({
    budgetId,
    destination,
    status: destination ? await destination.getStatus() : 'unset',
    label: destination?.label ?? null,
    lastBackupAt: toIsoString(getLastBackupAt(budgetId)),
  });
}

export function clearBackupState() {
  resetBackupState();
}

/** Must be called from a user gesture. */
export async function connectDestination(
  context: BackupProviderContext,
  kind: BackupDestinationKind,
): Promise<void> {
  const provider = getProvider(kind);
  if (!provider) {
    throw new Error(`Unknown backup provider: ${kind}`);
  }
  if (provider.availability !== 'available') {
    throw new Error(`Backup provider is not available yet: ${kind}`);
  }

  const connected = await provider.connect(context);
  if (!connected) {
    return;
  }

  await setBackupDestinationRecord(context.budgetId, {
    kind,
    payload: connected.payload,
    chosenAt: new Date().toISOString(),
  });
  setBackupState({
    budgetId: context.budgetId,
    destination: connected.destination,
    status: 'ready',
    label: connected.destination.label,
    lastResult: null,
  });
  notifyOtherTabs(context.budgetId);
}

/** Must be called from a user gesture. */
export async function reconnectDestination(
  context: BackupProviderContext,
): Promise<void> {
  const { destination } = getBackupState();
  if (!destination) {
    return;
  }
  const status = await destination.reconnect();
  setBackupState({ status, lastResult: null });
  notifyOtherTabs(context.budgetId);
}

export async function forgetDestination(
  context: BackupProviderContext,
): Promise<void> {
  await deleteBackupDestinationRecord(context.budgetId);
  setBackupState({
    budgetId: context.budgetId,
    destination: null,
    status: 'unset',
    label: null,
    lastResult: null,
  });
  notifyOtherTabs(context.budgetId);
}

let inFlightBackup: Promise<BackupWriteResult> | null = null;

/**
 * Writes a backup for the open budget. Concurrent calls share the same
 * in-flight write, so the scheduler and a "Back up now" click can never
 * overlap.
 */
export function performBackup(
  context: BackupProviderContext,
): Promise<BackupWriteResult> {
  if (inFlightBackup) {
    return inFlightBackup;
  }

  const { destination, status } = getBackupState();
  if (!destination || status !== 'ready') {
    return Promise.resolve({ ok: false, reason: 'access-lost' });
  }

  // Record when the export started rather than when it finished: changes
  // applied while it ran may not be in the snapshot and must stay pending.
  const startedAt = Date.now();
  setBackupState({ isBusy: true });
  inFlightBackup = runBackupTo(destination)
    .then(result => {
      if (result.ok === true) {
        setLastBackupAt(context.budgetId, startedAt);
        notifyOtherTabs(context.budgetId);
      } else if (result.reason === 'access-lost') {
        setBackupState({ status: 'needs-reconnect' });
      }
      setBackupState({ isBusy: false, lastResult: result });
      return result;
    })
    .finally(() => {
      inFlightBackup = null;
    });
  return inFlightBackup;
}
