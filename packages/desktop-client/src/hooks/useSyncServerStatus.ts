import { useSelector } from 'react-redux';

import { selectUserData } from 'loot-core/src/client/selectors';

import { useServerURL } from '../components/ServerContext';

type SyncServerStatus = 'offline' | 'no-server' | 'online';

export default function useSyncServerStatus(): SyncServerStatus {
  const serverUrl = useServerURL();
  const userData = useSelector(selectUserData);

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData.offline ? 'offline' : 'online';
}
