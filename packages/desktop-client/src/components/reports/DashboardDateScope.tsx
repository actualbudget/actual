import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import type { DashboardDateScope } from '@actual-app/core/types/models';

const DashboardDateScopeContext = createContext<DashboardDateScope | null>(
  null,
);

export function DashboardDateScopeProvider({
  scope,
  children,
}: {
  scope: DashboardDateScope | null;
  children: ReactNode;
}) {
  return (
    <DashboardDateScopeContext.Provider value={scope}>
      {children}
    </DashboardDateScopeContext.Provider>
  );
}

export function useDashboardDateScope() {
  return useContext(DashboardDateScopeContext);
}

export function addDashboardDateScopeToUrl(
  destination: string,
  scope: DashboardDateScope,
  widgetId: string,
) {
  const [path, query = ''] = destination.split('?');
  const params = new URLSearchParams(query);
  params.set('dashboardStart', scope.start);
  params.set('dashboardEnd', scope.end);
  params.set('dashboardMode', scope.mode);
  params.set('dashboardWidget', widgetId);
  return `${path}?${params}`;
}
