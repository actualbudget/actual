import { type ReactNode, useState } from 'react';

type ChildrenProps = {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
};
type SyncRefreshProps = {
  onSync: () => Promise<void>;
  children: (props: ChildrenProps) => ReactNode;
};
export default function SyncRefresh({ onSync, children }: SyncRefreshProps) {
  let [syncing, setSyncing] = useState(false);

  async function onSync_() {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  }

  return children({ refreshing: syncing, onRefresh: onSync_ });
}
