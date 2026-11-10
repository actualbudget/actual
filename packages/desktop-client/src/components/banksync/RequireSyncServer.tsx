import type { ReactNode } from 'react';
import { Navigate } from 'react-router';

import { useSidebarMenu } from '#hooks/useSidebarMenu';

type RequireSyncServerProps = {
  children: ReactNode;
};

export function RequireSyncServer({ children }: RequireSyncServerProps) {
  const { isItemAvailable } = useSidebarMenu();

  if (!isItemAvailable('bank-sync')) {
    return <Navigate to="/settings" replace />;
  }

  return children;
}
