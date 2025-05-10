import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function useDateFormat() {
  const [dateFormat] = useSyncedPref('dateFormat');
  return dateFormat;
}
