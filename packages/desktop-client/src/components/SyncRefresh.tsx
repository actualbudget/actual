import React, { useState, type ReactNode } from 'react';

type ChildrenProps = {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
};
type SyncRefreshProps = {
  onSync: () => Promise<void>;
  children: (props: ChildrenProps) => ReactNode;
};
export function SyncRefresh({ onSync, children }: SyncRefreshProps) {
  const [syncing, setSyncing] = useState(false);

  async function onSync_() {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  }

  return <>{children({ refreshing: syncing, onRefresh: onSync_ })}</>;
}
