import { useSelector } from 'react-redux';

import { type State } from 'loot-core/client/state-types';
import { type UserState } from 'loot-core/client/state-types/user';

import { useServerURL } from '../components/ServerContext';

export type SyncServerStatus = 'offline' | 'no-server' | 'online';

export function useSyncServerStatus(): SyncServerStatus {
  const serverUrl = useServerURL();
  const userData = useSelector<State, UserState['data']>(
    state => state.user.data,
  );

  if (!serverUrl) {
    return 'no-server';
  }

  return !userData || userData.offline ? 'offline' : 'online';
}
