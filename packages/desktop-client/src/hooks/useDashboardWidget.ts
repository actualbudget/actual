import { useQuery } from '@tanstack/react-query';

import type { DashboardWidgetEntity } from 'loot-core/types/models';

import { dashboardQueries } from '@desktop-client/reports';

export function useDashboardWidget<W extends DashboardWidgetEntity>(
  id: W['id'],
  type: W['type'],
) {
  return useQuery({
    ...dashboardQueries.listDashboardWidgets<W>(),
    select: widgets => widgets.find(w => w.id === id && w.type === type),
    enabled: !!id && !!type,
  });
}
