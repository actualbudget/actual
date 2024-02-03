import { useSelector } from 'react-redux';

export function useDateFormat() {
  return useSelector(state => state.prefs.local?.dateFormat);
}
