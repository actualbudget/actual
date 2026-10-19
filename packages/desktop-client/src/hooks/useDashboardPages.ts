import { DEFAULT_DASHBOARD_PAGE_ID } from '@actual-app/core/shared/dashboard';
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
  const { data: dashboardPages } = useDashboardPages();

  const knownPageIds = new Set((dashboardPages ?? []).map(page => page.id));

  // A widget whose page does not exist locally would be filtered off every
  // page and so be invisible — which is what used to happen to widgets
  // synced from a device with a different default page id. Surface them on
  // the adopting page: the default page when it exists, else the first one.
  const adoptingPageId = knownPageIds.has(DEFAULT_DASHBOARD_PAGE_ID)
    ? DEFAULT_DASHBOARD_PAGE_ID
    : dashboardPages?.[0]?.id;
  const isAdoptingPage =
    dashboardPageId != null && dashboardPageId === adoptingPageId;

  return useQuery({
    ...dashboardQueries.listDashboardWidgets<W>(),
    select: widgets =>
      widgets.filter(
        widget =>
          widget.dashboard_page_id === dashboardPageId ||
          (isAdoptingPage && !knownPageIds.has(widget.dashboard_page_id)),
      ),
    enabled: !!dashboardPageId,
  });
}
