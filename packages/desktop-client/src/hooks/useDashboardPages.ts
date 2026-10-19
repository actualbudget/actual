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
  // page and so be invisible. That is what happens to widgets synced from
  // another device: the default page is seeded by a migration, which runs
  // locally and emits no sync messages, so each device generated its own
  // id for it. Show those widgets on the first page, which `sort_order`
  // makes the seeded one on every device.
  const isAdoptingPage =
    dashboardPageId != null && dashboardPageId === dashboardPages?.[0]?.id;

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
