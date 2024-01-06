import { useSelector } from 'react-redux';

import { useServerURL } from '../components/ServerContext';

export type SyncServerStatus = 'offline' | 'no-server' | 'online';

export function useSyncServerStatus(): SyncServerStatus {
  const serverUrl = useServerURL();
  const userData = useSelector(state => state.user.data);

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData.offline ? 'offline' : 'online';
}
