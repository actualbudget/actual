import { useSelector } from 'react-redux';

export function useLocalPrefs() {
  return useSelector(state => state.prefs.local);
}
