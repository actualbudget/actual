import { useState } from 'react';

export default function SyncRefresh({ onSync, children }) {
  let [syncing, setSyncing] = useState(false);

  async function onSync_() {
    setSyncing(true);
    await onSync();
    setSyncing(false);
  }

  return children({ refreshing: syncing, onRefresh: onSync_ });
}
