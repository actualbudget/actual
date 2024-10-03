import { useSyncedPref } from './useSyncedPref';

export function usePrivacyMode() {
  const [isPrivacyEnabled] = useSyncedPref('isPrivacyEnabled');
  return String(isPrivacyEnabled) === 'true';
}
