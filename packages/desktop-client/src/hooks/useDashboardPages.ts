import { useQuery } from '@tanstack/react-query';

import type {
  DashboardPageEntity,
  DashboardWidgetEntity,
} from 'loot-core/types/models';

import { dashboardQueries } from '@desktop-client/reports';

export function useDashboardPages() {
  return useQuery(dashboardQueries.listDashboardPages());
}

export function useDashboardPageWidgets<W extends DashboardWidgetEntity>(
  dashboardPageId?: DashboardPageEntity['id'] | null,
) {
  return useQuery(
    dashboardQueries.listDashboardPageWidgets<W>(dashboardPageId),
  );
}
