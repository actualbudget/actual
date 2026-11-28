import { useEffect, useState } from 'react';

import { listen } from '@actual-app/core/platform/client/connection';

import { useMetadataPref } from '#hooks/useMetadataPref';

export type SyncState =
  | null
  | 'offline'
  | 'local'
  | 'disabled'
  | 'error'
  | 'pending-transition';

type UseSyncStatusOpts = {
  syncingEndDelayMs?: number;
};

export function useSyncStatus({
  syncingEndDelayMs = 0,
}: UseSyncStatusOpts = {}): {
  isSyncing: boolean;
  syncState: SyncState;
} {
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const [transition] = useMetadataPref('amountEncodingTransition');
  const pendingTransition = Boolean(transition);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(null);
  const [trackedPending, setTrackedPending] = useState(pendingTransition);

  // Drop a leftover pending outcome when the saved transition is cleared.
  // Specific failures stay put. A saved transition still covers the idle state.
  if (pendingTransition !== trackedPending) {
    setTrackedPending(pendingTransition);
    if (!pendingTransition) {
      setSyncState(current =>
        current === 'pending-transition' ? null : current,
      );
    }
  }

  const visibleSyncState: SyncState =
    pendingTransition &&
    syncState !== 'disabled' &&
    syncState !== 'offline' &&
    syncState !== 'error' &&
    syncState !== 'local'
      ? 'pending-transition'
      : syncState;

  useEffect(() => {
    let endTimeout: ReturnType<typeof setTimeout> | null = null;

    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        if (endTimeout) {
          clearTimeout(endTimeout);
          endTimeout = null;
        }
        setIsSyncing(true);
        setSyncState(null);
      } else if (syncingEndDelayMs > 0) {
        endTimeout = setTimeout(() => {
          setIsSyncing(false);
          endTimeout = null;
        }, syncingEndDelayMs);
      } else {
        setIsSyncing(false);
      }

      if (event.type === 'pending-transition') {
        setSyncState('pending-transition');
      } else if (event.type === 'error') {
        if (event.subtype === 'network') {
          setSyncState('offline');
        } else if (!cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (event.type === 'success') {
        setSyncState(event.syncDisabled ? 'disabled' : null);
      }
    });

    return () => {
      if (endTimeout) {
        clearTimeout(endTimeout);
      }
      unlisten();
    };
  }, [cloudFileId, syncingEndDelayMs]);

  return { isSyncing, syncState: visibleSyncState };
}
