import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { type Widget, type DashboardEntity } from 'loot-core/types/models';

import { useQuery } from './useQuery';

export function useDashboard(dashboardId: string | null) {
  const { data: queryData, isLoading } = useQuery<Widget>(() => {
    if (!dashboardId) {
      return null;
    }
    return q('dashboard').filter({ dashboard_id: dashboardId }).select('*');
  }, [dashboardId]);

  return useMemo(
    () => ({
      isLoading,
      data: queryData || [],
    }),
    [isLoading, queryData],
  );
}

export function useDashboards() {
  const { data: queryData, isLoading } = useQuery<DashboardEntity>(
    () => q('dashboards').select('*'),
    [],
  );

  return useMemo(
    () => ({
      isLoading,
      data: queryData || [],
    }),
    [isLoading, queryData],
  );
}
