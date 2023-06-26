import { useSelector } from 'react-redux';

import { useServerURL } from '../components/ServerContext';

type SyncServerStatus = 'offline' | 'no-server' | 'online';

export default function useSyncServerStatus(): SyncServerStatus {
  let serverUrl = useServerURL();
  let userData = useSelector(state => state.user.data);

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData.offline ? 'offline' : 'online';
}
