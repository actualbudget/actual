import { useSelector } from 'react-redux';

export function usePrivacyMode() {
  return useSelector(state => state.prefs?.local?.isPrivacyEnabled ?? false);
}
