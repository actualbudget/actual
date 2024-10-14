import { useSyncedPref } from './useSyncedPref';

export function useDateFormat() {
  const [dateFormat] = useSyncedPref('dateFormat');
  return dateFormat;
}
