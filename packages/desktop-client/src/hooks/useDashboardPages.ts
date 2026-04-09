import type {
  DashboardPageEntity,
  DashboardWidgetEntity,
} from '@actual-app/core/types/models';
import { useQuery } from '@tanstack/react-query';

import { dashboardQueries } from '#reports';

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
