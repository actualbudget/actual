import { useSelector } from 'react-redux';

export default function usePrivacyMode() {
  return useSelector(state => state.prefs?.local?.isPrivacyEnabled ?? false);
}
