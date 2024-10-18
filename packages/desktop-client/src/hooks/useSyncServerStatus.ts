import { useSelector } from 'react-redux';

import { useServerURL } from '../components/ServerContext';
import { type State } from '../state';

type SyncServerStatus = 'offline' | 'no-server' | 'online';

export function useSyncServerStatus(): SyncServerStatus {
  const serverUrl = useServerURL();
  const userData = useSelector((state: State) => state.user.data);

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData.offline ? 'offline' : 'online';
}
