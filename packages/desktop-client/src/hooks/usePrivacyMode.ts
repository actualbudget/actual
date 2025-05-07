import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

export function usePrivacyMode() {
  const [isPrivacyEnabled] = useSyncedPref('isPrivacyEnabled');
  return String(isPrivacyEnabled) === 'true';
}
