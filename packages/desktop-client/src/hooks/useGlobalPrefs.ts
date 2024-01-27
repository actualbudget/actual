import { useSelector } from 'react-redux';

export function useGlobalPrefs() {
  return useSelector(state => state.prefs.global);
}
