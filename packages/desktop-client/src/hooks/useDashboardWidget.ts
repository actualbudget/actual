import { useQuery } from '@tanstack/react-query';

import type { DashboardWidgetEntity } from 'loot-core/types/models';

import { dashboardQueries } from '@desktop-client/reports';

type UseDashboardWidgetProps<W extends DashboardWidgetEntity> = Partial<
  Pick<W, 'id' | 'type'>
>;

export function useDashboardWidget<W extends DashboardWidgetEntity>({
  id,
  type,
}: UseDashboardWidgetProps<W>) {
  return useQuery({
    ...dashboardQueries.listDashboardWidgets<W>(),
    select: widgets => widgets.find(w => w.id === id && w.type === type),
    enabled: !!id && !!type,
  });
}
