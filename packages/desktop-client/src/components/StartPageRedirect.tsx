import { Navigate } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { useSidebarMenu } from '#hooks/useSidebarMenu';

export function StartPageRedirect() {
  const { isNarrowWidth } = useResponsive();
  const { startPath } = useSidebarMenu();

  return <Navigate to={isNarrowWidth ? '/budget' : startPath} replace />;
}
