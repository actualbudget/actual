import { queryOptions } from '@tanstack/react-query';

import { send } from 'loot-core/platform/client/connection';
import { q } from 'loot-core/shared/query';
import type {
  CustomReportEntity,
  DashboardPageEntity,
  DashboardWidgetEntity,
} from 'loot-core/types/models';

import { aqlQuery } from '@desktop-client/queries/aqlQuery';

export const reportQueries = {
  all: () => ['reports'],
  lists: () => [...reportQueries.all(), 'lists'],
  list: () =>
    queryOptions<CustomReportEntity[]>({
      queryKey: [...reportQueries.lists()],
      queryFn: async () => {
        return await send('report/get');
      },
    }),
};

export const dashboardQueries = {
  all: () => ['dashboards'],
  lists: () => [...dashboardQueries.all(), 'lists'],
  listDashboardWidgets: <T extends DashboardWidgetEntity>() =>
    queryOptions<T[]>({
      queryKey: [...dashboardQueries.lists(), 'widgets'],
      queryFn: async () => {
        const { data }: { data: T[] } = await aqlQuery(
          q('dashboard').select('*'),
        );
        return data;
      },
    }),
  listDashboardPageWidgets: <T extends DashboardWidgetEntity>(
    dashboardPageId?: DashboardPageEntity['id'] | null,
  ) =>
    queryOptions<T[]>({
      ...dashboardQueries.listDashboardWidgets<T>(),
      select: widgets =>
        widgets.filter(w => w.dashboard_page_id === dashboardPageId),
      enabled: !!dashboardPageId,
    }),
  listDashboardPages: () =>
    queryOptions<DashboardPageEntity[]>({
      queryKey: [...dashboardQueries.lists(), 'pages'],
      queryFn: async () => {
        const { data }: { data: DashboardPageEntity[] } = await aqlQuery(
          q('dashboard_pages').select('*'),
        );
        return data;
      },
    }),
};
