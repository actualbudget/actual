import { Navigate } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { getMobileStartPath } from '#components/mobile/mobileStartPage';
import { useSidebarMenu } from '#hooks/useSidebarMenu';
import { useSyncedPref } from '#hooks/useSyncedPref';

export function StartPageRedirect() {
  const { isNarrowWidth } = useResponsive();
  const { startPath } = useSidebarMenu();
  // Mobile has its own pref: the tab bar offers different pages than the
  // sidebar, and people often want a different landing page on their phone
  const [mobileStartPagePref] = useSyncedPref('mobile-start-page');

  return (
    <Navigate
      to={isNarrowWidth ? getMobileStartPath(mobileStartPagePref) : startPath}
      replace
    />
  );
}
