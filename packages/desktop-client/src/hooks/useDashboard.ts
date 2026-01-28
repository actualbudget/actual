import { useMemo } from 'react';

import { q } from 'loot-core/shared/query';
import type { DashboardEntity, Widget } from 'loot-core/types/models';

import { useQuery } from './useQuery';

export function useDashboard(dashboardPageId: string) {
  const { data: queryData, isLoading } = useQuery<Widget>(() => {
    return q('dashboard')
      .filter({ dashboard_page_id: dashboardPageId })
      .select('*');
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
