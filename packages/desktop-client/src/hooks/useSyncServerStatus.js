import { useSelector } from 'react-redux';

export default function useSyncServerStatus() {
  const userData = useSelector(state => state.user.data);

  return !userData || userData.offline ? 'offline' : 'online';
}
