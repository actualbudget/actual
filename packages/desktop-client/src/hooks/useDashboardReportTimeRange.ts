import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

import * as monthUtils from '@actual-app/core/shared/months';
import type {
  DashboardDateScope,
  DashboardWidgetEntity,
  TimeFrame,
} from '@actual-app/core/types/models';

import { calculateTimeRange } from '#components/reports/reportRanges';
import { useDashboardPages } from '#hooks/useDashboardPages';
import { useDashboardWidget } from '#hooks/useDashboardWidget';

const MODES = new Set<TimeFrame['mode']>([
  'sliding-window',
  'static',
  'full',
  'lastMonth',
  'lastYear',
  'yearToDate',
  'priorYearToDate',
]);

export function resolveDashboardTimeRange(
  dashboardScope: DashboardDateScope | null,
  useDashboardDateRange: boolean,
  timeFrame?: Partial<TimeFrame>,
  defaultTimeFrame?: TimeFrame,
  latestTransaction?: string,
) {
  if (dashboardScope && useDashboardDateRange) {
    return [
      dashboardScope.start,
      dashboardScope.end,
      dashboardScope.mode,
    ] as const;
  }
  return calculateTimeRange(
    timeFrame,
    defaultTimeFrame,
    latestTransaction,
    dashboardScope?.end,
  );
}

export function useDashboardReportTimeRange(widget?: DashboardWidgetEntity) {
  const [params] = useSearchParams();
  const contextualWidgetId = params.get('dashboardWidget');
  const { data: contextualWidget } = useDashboardWidget<DashboardWidgetEntity>({
    id: widget ? undefined : (contextualWidgetId ?? undefined),
  });
  const dashboardWidget = widget ?? contextualWidget;
  const { data: dashboards = [] } = useDashboardPages();
  const dashboard = dashboards.find(
    page => page.id === dashboardWidget?.dashboard_page_id,
  );
  const start = params.get('dashboardStart');
  const end = params.get('dashboardEnd');
  const mode = params.get('dashboardMode') as TimeFrame['mode'] | null;
  const isValidDate = (value: string | null) =>
    Boolean(
      value &&
      (monthUtils.isValidYearMonth(value) ||
        monthUtils.isValidYearMonthDay(value)),
    );
  const hasValidSnapshot = Boolean(
    dashboardWidget &&
    (!contextualWidgetId || contextualWidgetId === dashboardWidget.id) &&
    isValidDate(start) &&
    isValidDate(end) &&
    start! <= end! &&
    mode &&
    MODES.has(mode),
  );
  const dashboardScope = useMemo<DashboardDateScope | null>(() => {
    if (!dashboard?.date_range_enabled || !dashboard.time_frame) {
      return null;
    }
    const persistedScope = calculateTimeRange(dashboard.time_frame);
    return {
      start: hasValidSnapshot ? start! : persistedScope[0],
      end: hasValidSnapshot ? end! : persistedScope[1],
      mode: hasValidSnapshot ? mode! : persistedScope[2],
    };
  }, [dashboard, end, hasValidSnapshot, mode, start]);
  const hasDashboardContext = dashboardScope !== null;
  const isUsingDashboardRange =
    hasDashboardContext && (dashboardWidget?.use_dashboard_date_range ?? true);

  const resolve = useCallback(
    (
      timeFrame?: Partial<TimeFrame>,
      defaultTimeFrame?: TimeFrame,
      latestTransaction?: string,
    ) => {
      return resolveDashboardTimeRange(
        dashboardScope,
        isUsingDashboardRange,
        timeFrame,
        defaultTimeFrame,
        latestTransaction,
      );
    },
    [dashboardScope, isUsingDashboardRange],
  );

  return {
    resolve,
    dashboardScope,
    dashboardWidget,
    hasDashboardContext,
    isUsingDashboardRange,
  };
}
