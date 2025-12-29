import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import { type Widget, type DashboardEntity } from 'loot-core/types/models';

import { useQuery } from './useQuery';

export function useDashboard(dashboardPageId: string) {
  const { data: queryData, isLoading } = useQuery<Widget>(() => {
    if (!dashboardPageId) {
      return null;
    }
    return q('dashboard').filter({ dashboard_page_id: dashboardPageId }).select('*');
  }, [dashboardPageId]);

  return useMemo(
    () => ({
      isLoading,
      data: queryData || [],
    }),
    [isLoading, queryData],
  );
}

export function useDashboardPages() {
  const { data: queryData, isLoading } = useQuery<DashboardEntity>(
    () => q('dashboard_pages').select('*'),
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
