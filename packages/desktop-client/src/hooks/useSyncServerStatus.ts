import { useServerURL } from '../components/ServerContext';
import { useAppSelector } from '../redux';

type SyncServerStatus = 'offline' | 'no-server' | 'online';

export function useSyncServerStatus(): SyncServerStatus {
  const serverUrl = useServerURL();
  const userData = useAppSelector(state => state.user.data);

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData?.offline ? 'offline' : 'online';
}
