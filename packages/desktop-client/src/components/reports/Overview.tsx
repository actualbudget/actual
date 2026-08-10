import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { ErrorBoundary } from 'react-error-boundary';
import ReactGridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CustomReportWidget,
  DashboardDateScope,
  DashboardPageEntity,
  DashboardWidgetEntity,
  ExportImportDashboard,
  MarkdownWidget,
  TimeFrame,
} from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { MobilePageHeader, Page } from '#components/Page';
import { useAccounts } from '#hooks/useAccounts';
import {
  useDashboardPages,
  useDashboardPageWidgets,
} from '#hooks/useDashboardPages';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNavigate } from '#hooks/useNavigate';
import { useReports } from '#hooks/useReports';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import {
  addNotification,
  removeNotification,
} from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import {
  useAddDashboardWidgetMutation,
  useDeleteDashboardPageMutation,
  useImportDashboardPageMutation,
  useResetDashboardPageMutation,
  useUpdateDashboardWidgetMutation,
  useUpdateDashboardWidgetsMutation,
} from '#reports/mutations';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';
import './overview.scss';
import { DashboardDateRangeControls } from './DashboardDateRangeControls';
import { DashboardDateScopeProvider } from './DashboardDateScope';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSelector } from './DashboardSelector';
import { LoadingIndicator } from './LoadingIndicator';
import {
  calculateSpendingReportTimeRange,
  calculateTimeRange,
} from './reportRanges';
import { AgeOfMoneyCard } from './reports/AgeOfMoneyCard';
import { BalanceForecastCard } from './reports/BalanceForecastCard';
import { BudgetAnalysisCard } from './reports/BudgetAnalysisCard';
import { CalendarCard } from './reports/CalendarCard';
import { CashFlowCard } from './reports/CashFlowCard';
import { CrossoverCard } from './reports/CrossoverCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { FormulaCard } from './reports/FormulaCard';
import { MarkdownCard } from './reports/MarkdownCard';
import { MissingReportCard } from './reports/MissingReportCard';
import { MonteCarloCard } from './reports/monte-carlo/MonteCarloCard';
import { NetWorthCard } from './reports/NetWorthCard';
import { SankeyCard } from './reports/SankeyCard';
import { SpendingCard } from './reports/SpendingCard';
import { SummaryCard } from './reports/SummaryCard';

function isCustomReportWidget(
  widget: DashboardWidgetEntity,
): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

function getWidgetMinHeight(widget: DashboardWidgetEntity) {
  if (
    isCustomReportWidget(widget) ||
    widget.type === 'markdown-card' ||
    widget.type === 'formula-card'
  ) {
    return 1;
  }

  if (widget.type === 'sankey-card') {
    return 3;
  }

  return 2;
}

function getWidgetMinWidth(widget: DashboardWidgetEntity) {
  if (widget.type === 'formula-card') {
    return 1;
  }

  if (isCustomReportWidget(widget) || widget.type === 'markdown-card') {
    return 2;
  }

  return 3;
}

const DASHBOARD_TIME_FRAME_MODES = new Set<TimeFrame['mode']>([
  'sliding-window',
  'static',
  'full',
  'lastMonth',
  'lastYear',
  'yearToDate',
  'priorYearToDate',
]);

function isDashboardDate(value: string | null) {
  return Boolean(
    value &&
    (monthUtils.isValidYearMonth(value) ||
      monthUtils.isValidYearMonthDay(value)),
  );
}

function getDashboardMeta<T extends DashboardWidgetEntity>(
  widget: T,
  dashboardScope?: DashboardDateScope | null,
): T['meta'] {
  if (!dashboardScope || widget.type === 'formula-card') {
    return widget.meta;
  }
  const usesTimeFrame = [
    'net-worth-card',
    'cash-flow-card',
    'crossover-card',
    'budget-analysis-card',
    'summary-card',
    'calendar-card',
    'sankey-card',
    'balance-forecast-card',
    'age-of-money-card',
  ].includes(widget.type);
  let timeFrame =
    widget.meta && 'timeFrame' in widget.meta
      ? widget.meta.timeFrame
      : undefined;
  let spendingRange: {
    compare: string;
    compareTo: string;
    isLive: false;
  } | null = null;
  if (widget.type === 'spending-card') {
    const [compare, compareTo] =
      (widget.use_dashboard_date_range ?? true)
        ? [dashboardScope.start, dashboardScope.end]
        : calculateSpendingReportTimeRange(
            widget.meta ?? {},
            dashboardScope.end,
          );
    spendingRange = { compare, compareTo, isLive: false };
  }
  if (usesTimeFrame && (widget.use_dashboard_date_range ?? true)) {
    timeFrame = {
      start: dashboardScope.start,
      end: dashboardScope.end,
      mode: 'static',
    };
  } else if (usesTimeFrame && timeFrame && timeFrame.mode !== 'static') {
    const [start, end] = calculateTimeRange(
      timeFrame,
      undefined,
      undefined,
      dashboardScope.end,
    );
    timeFrame = { start, end, mode: 'static' };
  }
  return {
    ...widget.meta,
    ...(timeFrame ? { timeFrame } : null),
    ...spendingRange,
  } as T['meta'];
}

type OverviewProps = {
  dashboard: DashboardPageEntity;
};

export function Overview({ dashboard }: OverviewProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const budgetAnalysisReportEnabled = useFeatureFlag('budgetAnalysisReport');
  const balanceForecastReportEnabled = useFeatureFlag('balanceForecastReport');
  const monteCarloReportEnabled = useFeatureFlag('monteCarloReport');

  const formulaMode = useFeatureFlag('formulaMode');

  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const currentBreakpoint: 'mobile' | 'desktop' = isNarrowWidth
    ? 'mobile'
    : 'desktop';

  const { data: customReports = [], isPending: isCustomReportsLoading } =
    useReports();

  const sankeyFeatureFlag = useFeatureFlag('sankeyReport');

  const customReportMap = useMemo(
    () => new Map(customReports.map(report => [report.id, report])),
    [customReports],
  );
  const { data: dashboardPages = [], isPending: isDashboardPageLoading } =
    useDashboardPages();

  const { data: widgets = [], isPending: isWidgetsLoading } =
    useDashboardPageWidgets(dashboard.id);
  const [earliestTransaction, setEarliestTransaction] = useState(
    monthUtils.currentDay(),
  );
  const [latestTransaction, setLatestTransaction] = useState(
    monthUtils.currentDay(),
  );
  const [allMonths, setAllMonths] = useState<Array<{ name: string }>>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardTimeFrame = useMemo<TimeFrame | null>(() => {
    const start = searchParams.get('dashboardStart');
    const end = searchParams.get('dashboardEnd');
    const mode = searchParams.get('dashboardMode') as TimeFrame['mode'] | null;

    if (
      !isDashboardDate(start) ||
      !isDashboardDate(end) ||
      start! > end! ||
      !mode ||
      !DASHBOARD_TIME_FRAME_MODES.has(mode)
    ) {
      return null;
    }

    return { start: start!, end: end!, mode };
  }, [searchParams]);
  const setDashboardTimeFrameInHistory = useCallback(
    (timeFrame: TimeFrame | null) => {
      setSearchParams(params => {
        if (timeFrame) {
          params.set('dashboardStart', timeFrame.start);
          params.set('dashboardEnd', timeFrame.end);
          params.set('dashboardMode', timeFrame.mode);
        } else {
          params.delete('dashboardStart');
          params.delete('dashboardEnd');
          params.delete('dashboardMode');
        }
        params.delete('dashboardWidget');
        return params;
      });
    },
    [setSearchParams],
  );

  useEffect(() => {
    async function loadTransactionRange() {
      const [earliest, latest] = await Promise.all([
        send('get-earliest-transaction'),
        send('get-latest-transaction'),
      ]);
      const first = earliest?.date ?? monthUtils.currentDay();
      const last = latest?.date ?? monthUtils.currentDay();
      setEarliestTransaction(first);
      setLatestTransaction(last);
      setAllMonths(
        monthUtils
          .rangeInclusive(
            monthUtils.monthFromDate(first),
            monthUtils.monthFromDate(last),
          )
          .map(name => ({ name }))
          .reverse(),
      );
    }
    void loadTransactionRange();
  }, []);

  const dashboardScope = useMemo<DashboardDateScope | null>(() => {
    if (!dashboardTimeFrame) {
      return null;
    }
    const [start, end, mode] = calculateTimeRange(
      dashboardTimeFrame,
      undefined,
      latestTransaction,
    );
    return { start, end, mode };
  }, [dashboardTimeFrame, latestTransaction]);

  const isLoading =
    isCustomReportsLoading || isWidgetsLoading || isDashboardPageLoading;

  const navigate = useNavigate();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const [containerWidth, setContainerWidth] = useState(0);
  const handleResize = useCallback((contentRect: DOMRectReadOnly) => {
    setContainerWidth(Math.floor(contentRect.width));
  }, []);
  const containerRef = useResizeObserver<HTMLDivElement>(handleResize);
  const isMounted = containerWidth > 0;

  const mobileLayout = useMemo(() => {
    if (widgets.length === 0) {
      return [];
    }

    const sortedDesktopItems = [...widgets];

    // Sort to ensure that items are ordered top-to-bottom, and for items on the same row, left-to-right
    sortedDesktopItems.sort((a, b) => {
      if (a.y < b.y) return -1;
      if (a.y > b.y) return 1;
      if (a.x < b.x) return -1;
      if (a.x > b.x) return 1;
      return 0;
    });

    let currentY = 0;
    return sortedDesktopItems.map(widget => {
      const itemY = currentY;
      currentY += widget.height;

      return {
        i: widget.id,
        x: 0,
        y: itemY, // Calculate correct y co-ordinate to prevent react-grid-layout's auto-compacting behaviour
        w: 1,
        h: widget.height,
      };
    });
  }, [widgets]);

  const desktopLayout = useMemo(() => {
    return widgets.map(widget => ({
      i: widget.id,
      x: widget.x,
      y: widget.y,
      w: widget.width,
      h: widget.height,
      minW: getWidgetMinWidth(widget),
      minH: getWidgetMinHeight(widget),
    }));
  }, [widgets]);

  const currentLayout = useMemo(
    () => (currentBreakpoint === 'desktop' ? desktopLayout : mobileLayout),
    [currentBreakpoint, desktopLayout, mobileLayout],
  );

  const widgetMap = useMemo(
    () => new Map((widgets ?? []).map(widget => [widget.id, widget])),
    [widgets],
  );

  const closeNotifications = () => {
    dispatch(removeNotification({ id: 'import' }));
  };

  // Close import notifications when doing "undo" operation
  useHotkeys(
    'ctrl+z, cmd+z, meta+z',
    closeNotifications,
    {
      scopes: ['app'],
    },
    [closeNotifications],
  );

  const { undo } = useUndo();

  const onDispatchSucessNotification = (message: string) => {
    dispatch(
      addNotification({
        notification: {
          id: 'import',
          type: 'message',
          sticky: true,
          timeout: 30_000, // 30s
          message,
          messageActions: {
            undo: () => {
              closeNotifications();
              undo();
            },
          },
        },
      }),
    );
  };

  const resetDashboardPageMutation = useResetDashboardPageMutation();

  const onResetDashboard = async () => {
    setIsImporting(true);

    resetDashboardPageMutation.mutate(
      {
        id: dashboard.id,
      },
      {
        onSettled: () => {
          setIsImporting(false);
        },
        onSuccess: () => {
          onDispatchSucessNotification(
            t(
              "Dashboard has been successfully reset to default state. Don't like what you see? You can always press [ctrl+z](#undo) to undo.",
            ),
          );
        },
      },
    );
  };

  const updateDashboardWidgetsMutation = useUpdateDashboardWidgetsMutation();

  const onLayoutChange = (newLayout: Layout) => {
    if (!isEditing) {
      return;
    }

    updateDashboardWidgetsMutation.mutate({
      widgets: newLayout.map(item => ({
        id: item.i,
        width: item.w,
        height: item.h,
        x: item.x,
        y: item.y,
      })),
    });
  };

  const addDashboardWidgetMutation = useAddDashboardWidgetMutation();

  const onAddWidget = <T extends DashboardWidgetEntity>(
    type: T['type'],
    meta: T['meta'] = null,
  ) => {
    addDashboardWidgetMutation.mutate({
      widget: {
        type,
        width: 4,
        height: type === 'sankey-card' ? 3 : 2,
        meta,
        dashboard_page_id: dashboard.id,
        use_dashboard_date_range: type !== 'calendar-card',
      },
    });
  };

  const onExport = () => {
    const data = {
      version: 1,
      widgets: widgets.map(widget => {
        if (isCustomReportWidget(widget)) {
          const customReport = customReportMap.get(widget.meta.id);

          if (!customReport) {
            throw new Error(`Custom report not found for widget: ${widget.id}`);
          }
          const {
            id: _id,
            dashboard_page_id: _dashboardPageId,
            tombstone: _tombstone,
            ...exportWidget
          } = widget;

          return {
            ...exportWidget,
            meta: customReport,
          };
        }

        const {
          id: _id,
          dashboard_page_id: _dashboardPageId,
          tombstone: _tombstone,
          ...exportWidget
        } = widget;
        return exportWidget;
      }),
    } satisfies ExportImportDashboard;

    void window.Actual.saveFile(
      JSON.stringify(data, null, 2),
      'dashboard.json',
      t('Export Dashboard'),
    );
  };

  const importDashboardPageMutation = useImportDashboardPageMutation();

  const onImport = async () => {
    const openFileDialog = window.Actual.openFileDialog;

    if (!openFileDialog) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t(
              'Fatal error occurred: unable to open import file dialog.',
            ),
          },
        }),
      );
      return;
    }

    const [filePath] = await openFileDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'JSON files',
          extensions: ['json'],
        },
      ],
    });

    closeNotifications();
    setIsImporting(true);

    importDashboardPageMutation.mutate(
      {
        filePath,
        dashboardPageId: dashboard.id,
      },
      {
        onSettled: () => {
          setIsImporting(false);
        },
        onSuccess: () => {
          onDispatchSucessNotification(
            t(
              "Dashboard has been successfully imported. Don't like what you see? You can always press [ctrl+z](#undo) to undo.",
            ),
          );
        },
        onError: error => {
          const originalError = error.cause;
          if (originalError instanceof Error) {
            switch (originalError.cause) {
              case 'json-parse-error':
                dispatch(
                  addNotification({
                    notification: {
                      id: 'import',
                      type: 'error',
                      message: t('Failed parsing the imported JSON.'),
                    },
                  }),
                );
                break;

              case 'validation-error':
                dispatch(
                  addNotification({
                    notification: {
                      id: 'import',
                      type: 'error',
                      message: error.message,
                    },
                  }),
                );
                break;

              default:
                dispatch(
                  addNotification({
                    notification: {
                      id: 'import',
                      type: 'error',
                      message: t('Failed importing the dashboard file.'),
                    },
                  }),
                );
                break;
            }
          }
        },
      },
    );
  };

  const updateDashboardWidgetMutation = useUpdateDashboardWidgetMutation();

  const onMetaChange = (
    widget: { i: string },
    newMeta: DashboardWidgetEntity['meta'],
  ) => {
    updateDashboardWidgetMutation.mutate({
      widget: {
        id: widget.i,
        meta: newMeta,
      },
    });
  };

  const deleteDashboardPageMutation = useDeleteDashboardPageMutation();

  const onDeleteDashboard = async (id: string) => {
    deleteDashboardPageMutation.mutate(
      { id },
      {
        onSuccess: () => {
          const nextDashboard = dashboardPages.find(d => d.id !== id);
          // NOTE: This should hold since invariant dashboard_pages > 1
          if (nextDashboard) {
            void navigate(`/reports/${nextDashboard.id}`);
          }
        },
      },
    );
  };

  const { data: accounts = [] } = useAccounts();

  function renderWidget(
    widget: DashboardWidgetEntity,
    activeDashboardScope?: DashboardDateScope | null,
  ) {
    const common = {
      widgetId: widget.id,
      isEditing,
    };
    const changeMeta = (meta: DashboardWidgetEntity['meta']) => {
      if (!activeDashboardScope || !meta) {
        onMetaChange({ i: widget.id }, meta);
        return;
      }
      const dateKeys = ['timeFrame', 'compare', 'compareTo', 'isLive'];
      const originalMeta = (widget.meta ?? {}) as Record<string, unknown>;
      const persistedMeta = Object.fromEntries(
        Object.entries(meta).filter(([key]) => !dateKeys.includes(key)),
      );
      dateKeys.forEach(key => {
        if (Object.hasOwn(originalMeta, key)) {
          persistedMeta[key] = originalMeta[key];
        }
      });
      onMetaChange(
        { i: widget.id },
        persistedMeta as DashboardWidgetEntity['meta'],
      );
    };

    switch (widget.type) {
      case 'net-worth-card':
        return (
          <NetWorthCard
            {...common}
            accounts={accounts}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'crossover-card':
        return (
          <CrossoverCard
            {...common}
            accounts={accounts}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'age-of-money-card':
        return (
          <AgeOfMoneyCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'cash-flow-card':
        return (
          <CashFlowCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'spending-card':
        return (
          <SpendingCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'budget-analysis-card':
        return budgetAnalysisReportEnabled ? (
          <BudgetAnalysisCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        ) : null;
      case 'balance-forecast-card':
        return balanceForecastReportEnabled ? (
          <BalanceForecastCard
            {...common}
            accounts={accounts}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        ) : null;
      case 'markdown-card':
        return (
          <MarkdownCard
            {...common}
            meta={widget.meta}
            onMetaChange={changeMeta}
          />
        );
      case 'custom-report':
        return (
          <CustomReportListCards
            {...common}
            report={customReportMap.get(widget.meta.id)}
            useDashboardDateRange={widget.use_dashboard_date_range}
          />
        );
      case 'summary-card':
        return (
          <SummaryCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        );
      case 'calendar-card':
        return (
          <CalendarCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            firstDayOfWeekIdx={firstDayOfWeekIdx}
            onMetaChange={changeMeta}
          />
        );
      case 'formula-card':
        return formulaMode ? (
          <FormulaCard
            {...common}
            meta={widget.meta}
            onMetaChange={changeMeta}
          />
        ) : null;
      case 'sankey-card':
        return sankeyFeatureFlag ? (
          <SankeyCard
            {...common}
            meta={getDashboardMeta(widget, activeDashboardScope)}
            onMetaChange={changeMeta}
          />
        ) : null;
      case 'monte-carlo-card':
        return monteCarloReportEnabled ? (
          <MonteCarloCard
            {...common}
            meta={widget.meta}
            onMetaChange={changeMeta}
          />
        ) : null;
      default:
        return null;
    }
  }

  if (isLoading) {
    return <LoadingIndicator message={t('Loading reports...')} />;
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <View>
            <MobilePageHeader
              title={
                <View
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Trans>Reports</Trans>: {dashboard.name}
                </View>
              }
            />
            <View
              style={{
                padding: '5px',
                borderBottom: '1px solid ' + theme.pillBorder,
                backgroundColor: theme.mobilePageBackground,
                gap: 10,
              }}
            >
              <DashboardSelector
                dashboards={dashboardPages}
                currentDashboard={dashboard}
              />
              <DashboardDateRangeControls
                timeFrame={dashboardTimeFrame}
                scope={dashboardScope}
                onChange={setDashboardTimeFrameInHistory}
                onClear={() => setDashboardTimeFrameInHistory(null)}
                allMonths={allMonths}
                earliestTransaction={earliestTransaction}
                latestTransaction={latestTransaction}
              />
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginRight: 15,
              alignItems: 'center',
            }}
          >
            <DashboardHeader dashboard={dashboard} />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'stretch',
              }}
            >
              {currentBreakpoint === 'desktop' && (
                <>
                  <DashboardDateRangeControls
                    timeFrame={dashboardTimeFrame}
                    scope={dashboardScope}
                    onChange={setDashboardTimeFrameInHistory}
                    onClear={() => setDashboardTimeFrameInHistory(null)}
                    allMonths={allMonths}
                    earliestTransaction={earliestTransaction}
                    latestTransaction={latestTransaction}
                  />

                  {/* Dashboard Selector */}
                  <DashboardSelector
                    dashboards={dashboardPages}
                    currentDashboard={dashboard}
                  />

                  <View
                    style={{
                      height: 'auto',
                      borderLeft: `1.5px solid ${theme.pillBorderDark}`,
                      borderRadius: 0.75,
                      marginLeft: 7,
                      marginRight: 7,
                    }}
                  />

                  <DialogTrigger>
                    <Button variant="primary" isDisabled={isImporting}>
                      <Trans>Add new widget</Trans>
                    </Button>

                    <Popover>
                      <Dialog>
                        <Menu
                          slot="close"
                          onMenuSelect={item => {
                            if (item === 'custom-report') {
                              void navigate('/reports/custom');
                              return;
                            }

                            function isExistingCustomReport(
                              name: string,
                            ): name is `custom-report-${string}` {
                              return name.startsWith('custom-report-');
                            }
                            if (isExistingCustomReport(item)) {
                              const [, reportId] = item.split('custom-report-');
                              onAddWidget<CustomReportWidget>('custom-report', {
                                id: reportId,
                              });
                              return;
                            }

                            if (item === 'markdown-card') {
                              onAddWidget<MarkdownWidget>(item, {
                                content: `### ${t('Text Widget')}\n\n${t('Edit this widget to change the **markdown** content.')}`,
                              });
                              return;
                            }

                            onAddWidget(item);
                          }}
                          items={[
                            {
                              name: 'cash-flow-card' as const,
                              text: t('Cash flow graph'),
                            },
                            {
                              name: 'net-worth-card' as const,
                              text: t('Net worth graph'),
                            },
                            {
                              name: 'crossover-card' as const,
                              text: t('Crossover point'),
                            },
                            {
                              name: 'age-of-money-card' as const,
                              text: t('Age of Money'),
                            },
                            {
                              name: 'spending-card' as const,
                              text: t('Spending analysis'),
                            },
                            ...(budgetAnalysisReportEnabled
                              ? [
                                  {
                                    name: 'budget-analysis-card' as const,
                                    text: t('Budget analysis'),
                                  },
                                ]
                              : []),
                            ...(balanceForecastReportEnabled
                              ? [
                                  {
                                    name: 'balance-forecast-card' as const,
                                    text: t('Balance forecast'),
                                  },
                                ]
                              : []),
                            ...(monteCarloReportEnabled
                              ? [
                                  {
                                    name: 'monte-carlo-card' as const,
                                    text: t('Monte Carlo analysis'),
                                  },
                                ]
                              : []),
                            {
                              name: 'markdown-card' as const,
                              text: t('Text widget'),
                            },
                            {
                              name: 'summary-card' as const,
                              text: t('Summary card'),
                            },
                            {
                              name: 'calendar-card' as const,
                              text: t('Calendar card'),
                            },
                            ...(formulaMode
                              ? [
                                  {
                                    name: 'formula-card' as const,
                                    text: t('Formula card'),
                                  },
                                ]
                              : []),
                            ...(sankeyFeatureFlag
                              ? [
                                  {
                                    name: 'sankey-card' as const,
                                    text: t('Sankey card'),
                                  },
                                ]
                              : []),
                            {
                              name: 'custom-report' as const,
                              text: t('New custom report'),
                            },
                            ...(customReports.length
                              ? ([Menu.line] satisfies Array<typeof Menu.line>)
                              : []),
                            ...customReports.map(report => ({
                              name: `custom-report-${report.id}` as const,
                              text: report.name,
                            })),
                          ]}
                        />
                      </Dialog>
                    </Popover>
                  </DialogTrigger>

                  {/* The Editing Button */}
                  {isEditing ? (
                    <Button
                      isDisabled={isImporting}
                      onPress={() => setIsEditing(false)}
                    >
                      <Trans>Finish editing dashboard</Trans>
                    </Button>
                  ) : (
                    <Button
                      isDisabled={isImporting}
                      onPress={() => setIsEditing(true)}
                    >
                      <Trans>Edit dashboard</Trans>
                    </Button>
                  )}

                  {/* The Menu */}
                  <DialogTrigger>
                    <Button variant="bare" aria-label={t('Menu')}>
                      <SvgDotsHorizontalTriple
                        width={15}
                        height={15}
                        style={{ transform: 'rotateZ(90deg)' }}
                      />
                    </Button>
                    <Popover>
                      <Dialog>
                        <Menu
                          slot="close"
                          onMenuSelect={item => {
                            switch (item) {
                              case 'reset':
                                void onResetDashboard();
                                break;
                              case 'export':
                                onExport();
                                break;
                              case 'import':
                                void onImport();
                                break;
                              case 'delete':
                                void onDeleteDashboard(dashboard.id);
                                break;
                              default:
                                throw new Error(
                                  `Unrecognized menu option: ${String(item)}`,
                                );
                            }
                          }}
                          items={[
                            {
                              name: 'reset',
                              text: t('Reset to default'),
                              disabled: isImporting,
                            },
                            Menu.line,
                            {
                              name: 'import',
                              text: t('Import'),
                              disabled: isImporting,
                            },
                            {
                              name: 'export',
                              text: t('Export'),
                              disabled: isImporting,
                            },
                            Menu.line,
                            {
                              name: 'delete',
                              text: t('Delete dashboard'),
                              disabled:
                                isImporting || dashboardPages.length <= 1,
                            },
                          ]}
                        />
                      </Dialog>
                    </Popover>
                  </DialogTrigger>
                </>
              )}
            </View>
          </View>
        )
      }
      padding={10}
    >
      {isImporting ? (
        <LoadingIndicator message={t('Import is running...')} />
      ) : (
        <div>
          <View
            data-testid="reports-overview"
            innerRef={containerRef}
            style={{ userSelect: 'none', paddingBottom: MOBILE_NAV_HEIGHT }}
          >
            {isMounted && (
              <DashboardDateScopeProvider scope={dashboardScope}>
                <ReactGridLayout
                  width={containerWidth}
                  layout={currentLayout}
                  gridConfig={{
                    cols: currentBreakpoint === 'desktop' ? 12 : 1,
                    rowHeight: 100,
                  }}
                  dragConfig={{
                    enabled: currentBreakpoint === 'desktop' && isEditing,
                    cancel: `.${NON_DRAGGABLE_AREA_CLASS_NAME}`,
                  }}
                  resizeConfig={{
                    enabled: currentBreakpoint === 'desktop' && isEditing,
                  }}
                  onLayoutChange={
                    currentBreakpoint === 'desktop' ? onLayoutChange : undefined
                  }
                >
                  {currentLayout.map(item => {
                    const widget = widgetMap.get(item.i);

                    if (!widget) {
                      return null;
                    }

                    return (
                      <div key={item.i}>
                        <ErrorBoundary
                          fallbackRender={() => (
                            <MissingReportCard
                              widgetId={item.i}
                              isEditing={isEditing}
                            >
                              <Trans>This widget has failed to load.</Trans>
                            </MissingReportCard>
                          )}
                        >
                          {renderWidget(widget, dashboardScope)}
                        </ErrorBoundary>
                      </div>
                    );
                  })}
                </ReactGridLayout>
              </DashboardDateScopeProvider>
            )}
          </View>
        </div>
      )}
    </Page>
  );
}
