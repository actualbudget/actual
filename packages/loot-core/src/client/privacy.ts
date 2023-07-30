import { useSelector } from 'react-redux';

import { selectLocalPerfIsPrivacyEnabled } from './selectors';

export default function usePrivacyMode() {
  return useSelector(selectLocalPerfIsPrivacyEnabled);
}
