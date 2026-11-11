import { useCallback, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ReactGridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useHoverMenu } from '@actual-app/components/hooks/useHoverMenu';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { findDuplicateWidget } from '@actual-app/core/shared/dashboard';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CustomReportWidget,
  DashboardPageEntity,
  DashboardWidgetEntity,
  ExportImportDashboard,
  MarkdownWidget,
} from '@actual-app/core/types/models';

import { MOBILE_NAV_HEIGHT } from '#components/mobile/MobileNavTabs';
import { MobilePageHeader, Page } from '#components/Page';
import { DashboardCaptureProvider } from '#components/reports/DashboardCaptureContext';
import {
  renderDashboardToPdf,
  renderDashboardToPng,
  resolveCssColor,
} from '#components/reports/dashboardExport';
import type { DashboardExportFormat } from '#components/reports/dashboardExport';
import { useAccounts } from '#hooks/useAccounts';
import {
  useDashboardPages,
  useDashboardPageWidgets,
} from '#hooks/useDashboardPages';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useLocale } from '#hooks/useLocale';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { useReports } from '#hooks/useReports';
import { useResizeObserver } from '#hooks/useResizeObserver';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUndo } from '#hooks/useUndo';
import { pushModal } from '#modals/modalsSlice';
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
import { DashboardHeader } from './DashboardHeader';
import './overview.scss';
import { DashboardSelector } from './DashboardSelector';
import { LoadingIndicator } from './LoadingIndicator';
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

function getWidgetMinHeight(widget: DashboardWidgetEntity) {
  switch (widget.type) {
    case 'custom-report':
    case 'markdown-card':
    case 'formula-card':
      return 1;
    case 'sankey-card':
      return 3;
    default:
      return 2;
  }
}

function getWidgetMinWidth(widget: DashboardWidgetEntity) {
  switch (widget.type) {
    case 'formula-card':
      return 1;
    case 'custom-report':
    case 'markdown-card':
    case 'cash-flow-card':
    case 'summary-card':
      return 2;
    default:
      return 3;
  }
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
  // While an image/PDF export renders, every card is drawn eagerly in its
  // normal (non-editing) look.
  const [isCapturing, setIsCapturing] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const locale = useLocale();
  const [budgetName] = useMetadataPref('budgetName');

  // Toolbar dropdowns open on hover (desktop) and can be pinned by clicking.
  const addWidgetMenu = useHoverMenu();
  const dashboardMenu = useHoverMenu();
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
    if (!widgets || widgets.length === 0) {
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
    if (!widgets) return [];
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
      },
    });
  };

  const onExportJson = async () => {
    const data = {
      version: 1,
      widgets: desktopLayout.map(item => {
        const widget = widgetMap.get(item.i);

        if (!widget) {
          throw new Error(`Unable to query widget: ${item.i}`);
        }

        if (widget.type === 'custom-report') {
          const customReport = customReportMap.get(widget.meta.id);

          if (!customReport) {
            throw new Error(`Custom report not found for widget: ${item.i}`);
          }

          return {
            ...widget,
            meta: customReport,
            id: undefined,
            tombstone: undefined,
          };
        }

        return { ...widget, id: undefined, tombstone: undefined };
      }),
    } satisfies ExportImportDashboard;

    try {
      await window.Actual.saveFile(
        JSON.stringify(data, null, 2),
        'dashboard.json',
        t('Export Dashboard'),
      );
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to export the dashboard file.'),
          },
        }),
      );
    }
  };

  const captureContainerRef = useRef<HTMLDivElement | null>(null);

  const exportFileBaseName = () =>
    `${monthUtils.currentDay()} - ${[budgetName, dashboard.name]
      .filter(Boolean)
      .join(' - ')}`
      .replace(/[\\/:*?"<>|]+/g, '-')
      .trim();

  // Renders the dashboard to an image (PNG) or a paginated, printable PDF.
  const onExportImage = async (format: 'png' | 'pdf') => {
    const container = captureContainerRef.current;
    if (!container) {
      throw new Error('Dashboard is not mounted');
    }

    setIsCapturing(true);
    try {
      // Give cards that were not scrolled into view yet a chance to render
      // and load their data, then let chart animations settle.
      const deadline = Date.now() + 10_000;
      await new Promise(resolve => setTimeout(resolve, 100));
      while (
        container.querySelector('[data-dashboard-loading]') &&
        Date.now() < deadline
      ) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (container.querySelector('[data-dashboard-loading]')) {
        throw new Error('Dashboard widgets did not finish loading');
      }
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1600));

      const gridElement =
        container.querySelector<HTMLElement>('.react-grid-layout');
      if (!gridElement) {
        throw new Error('Dashboard grid not found');
      }
      const widgetElements = Array.from(
        gridElement.querySelectorAll<HTMLElement>('[data-widget-id]'),
      ).map(element => ({
        id: element.dataset.widgetId ?? '',
        element,
      }));

      const renderOptions = {
        gridElement,
        widgetElements,
        header: {
          title: [budgetName, dashboard.name].filter(Boolean).join(' — '),
          subtitle: monthUtils.format(monthUtils.currentDay(), 'PPPP', locale),
        },
        theme: {
          backgroundColor: resolveCssColor(theme.pageBackground),
          textColor: resolveCssColor(theme.pageText),
          subduedTextColor: resolveCssColor(theme.pageTextSubdued),
          fontFamily: getComputedStyle(gridElement).fontFamily,
        },
      };

      const bytes =
        format === 'png'
          ? await renderDashboardToPng(renderOptions)
          : await renderDashboardToPdf(renderOptions);

      await window.Actual.saveFile(
        bytes,
        `${exportFileBaseName()}.${format}`,
        t('Export Dashboard'),
      );
    } catch (error) {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to export the dashboard. Please try again.'),
          },
        }),
      );
      throw error;
    } finally {
      setIsCapturing(false);
    }
  };

  const onExport = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'export-dashboard',
          options: {
            dashboardName: dashboard.name,
            onExport: async (format: DashboardExportFormat) => {
              if (format === 'json') {
                await onExportJson();
                return;
              }
              await onExportImage(format);
            },
          },
        },
      }),
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

  const isCardEditing = isEditing && !isCapturing;

  type AddWidgetMenuItemName =
    | Exclude<DashboardWidgetEntity['type'], 'custom-report'>
    | 'custom-report'
    | `custom-report-${string}`;

  // The widget (type + initial settings) a menu item would create.
  const getNewWidgetContent = (
    item: AddWidgetMenuItemName,
  ): [DashboardWidgetEntity['type'], DashboardWidgetEntity['meta']] => {
    if (item.startsWith('custom-report-')) {
      const [, reportId] = item.split('custom-report-');
      return [
        'custom-report',
        { id: reportId } satisfies CustomReportWidget['meta'],
      ];
    }
    if (item === 'markdown-card') {
      return [
        'markdown-card',
        {
          content: `### ${t('Text Widget')}\n\n${t('Edit this widget to change the **markdown** content.')}`,
        } satisfies MarkdownWidget['meta'],
      ];
    }
    return [item as DashboardWidgetEntity['type'], null];
  };

  // A dashboard never holds two widgets showing the exact same data, so
  // entries that would duplicate an existing widget are disabled.
  const withDuplicateCheck = (item: {
    name: AddWidgetMenuItemName;
    text: string;
  }) => {
    if (item.name === 'custom-report') {
      return item;
    }
    const [type, meta] = getNewWidgetContent(item.name);
    const isDuplicate = !!findDuplicateWidget(widgets, { type, meta });
    return {
      ...item,
      disabled: isDuplicate,
      tooltip: isDuplicate
        ? t('This widget is already on the dashboard')
        : undefined,
    };
  };

  const addWidgetMenuItems = [
    ...(
      [
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
      ] satisfies Array<{ name: AddWidgetMenuItemName; text: string }>
    ).map(withDuplicateCheck),
    ...(customReports.length
      ? ([Menu.line] satisfies Array<typeof Menu.line>)
      : []),
    ...customReports
      .map(report => ({
        name: `custom-report-${report.id}` as const,
        text: report.name,
      }))
      .map(withDuplicateCheck),
  ];

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
              }}
            >
              <DashboardSelector
                dashboards={dashboardPages}
                currentDashboard={dashboard}
              />
            </View>
          </View>
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginRight: 20,
              marginBottom: 4,
              alignItems: 'center',
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <DashboardHeader dashboard={dashboard} />
              <Text style={{ ...styles.pageSubtitle, marginLeft: 20 }}>
                <Trans>
                  Charts built from your transactions. Click a card to explore
                  it, or add widgets to customize this dashboard.
                </Trans>
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 5,
                alignItems: 'stretch',
              }}
            >
              {currentBreakpoint === 'desktop' && (
                <>
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

                  {/* Adding widgets is part of editing the dashboard, so the
                      "Add new widget" menu only shows while in edit mode. */}
                  {isEditing && (
                    <>
                      <Button
                        ref={addWidgetMenu.triggerRef}
                        {...addWidgetMenu.triggerProps}
                        isDisabled={isImporting}
                        data-testid="add-widget-button"
                        onPress={addWidgetMenu.toggle}
                      >
                        <Trans>Add new widget</Trans>
                      </Button>

                      <Popover {...addWidgetMenu.popoverProps}>
                        <Menu
                          onMenuSelect={item => {
                            addWidgetMenu.close();
                            if (item === 'custom-report') {
                              void navigate('/reports/custom');
                              return;
                            }

                            const [type, meta] = getNewWidgetContent(item);
                            onAddWidget(type, meta);
                          }}
                          items={addWidgetMenuItems}
                        />
                      </Popover>
                    </>
                  )}

                  {/* The Editing Button */}
                  {isEditing ? (
                    <Button
                      variant="primary"
                      isDisabled={isImporting}
                      onPress={() => setIsEditing(false)}
                      data-testid="edit-dashboard-button"
                    >
                      <Trans>Finish editing dashboard</Trans>
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      isDisabled={isImporting}
                      onPress={() => setIsEditing(true)}
                      data-testid="edit-dashboard-button"
                    >
                      <Trans>Edit dashboard</Trans>
                    </Button>
                  )}

                  {/* The Menu */}
                  <Button
                    ref={dashboardMenu.triggerRef}
                    {...dashboardMenu.triggerProps}
                    variant="bare"
                    aria-label={t('Menu')}
                    data-testid="dashboard-menu-button"
                    onPress={dashboardMenu.toggle}
                  >
                    <SvgDotsHorizontalTriple
                      width={15}
                      height={15}
                      style={{ transform: 'rotateZ(90deg)' }}
                    />
                  </Button>
                  <Popover {...dashboardMenu.popoverProps}>
                    <Menu
                      onMenuSelect={item => {
                        dashboardMenu.close();
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
                          disabled: isImporting || dashboardPages.length <= 1,
                        },
                      ]}
                    />
                  </Popover>
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
        <DashboardCaptureProvider value={isCapturing}>
          <div
            ref={captureContainerRef}
            data-dashboard-capturing={isCapturing ? 'true' : undefined}
          >
            <View
              data-testid="reports-overview"
              innerRef={containerRef}
              style={{ userSelect: 'none', paddingBottom: MOBILE_NAV_HEIGHT }}
            >
              {isMounted && (
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
                      <div key={item.i} data-widget-id={item.i}>
                        <ErrorBoundary
                          fallbackRender={() => (
                            <MissingReportCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                            >
                              <Trans>This widget has failed to load.</Trans>
                            </MissingReportCard>
                          )}
                        >
                          {widget.type === 'net-worth-card' ? (
                            <NetWorthCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              accounts={accounts}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'crossover-card' ? (
                            <CrossoverCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              accounts={accounts}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'age-of-money-card' ? (
                            <AgeOfMoneyCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'cash-flow-card' ? (
                            <CashFlowCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'spending-card' ? (
                            <SpendingCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'budget-analysis-card' &&
                            budgetAnalysisReportEnabled ? (
                            <BudgetAnalysisCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'balance-forecast-card' &&
                            balanceForecastReportEnabled ? (
                            <BalanceForecastCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              accounts={accounts}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'markdown-card' ? (
                            <MarkdownCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'custom-report' ? (
                            <CustomReportListCards
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              report={customReportMap.get(widget.meta.id)}
                            />
                          ) : widget.type === 'summary-card' ? (
                            <SummaryCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'calendar-card' ? (
                            <CalendarCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              firstDayOfWeekIdx={firstDayOfWeekIdx}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'formula-card' && formulaMode ? (
                            <FormulaCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'sankey-card' &&
                            sankeyFeatureFlag ? (
                            <SankeyCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : widget.type === 'monte-carlo-card' &&
                            monteCarloReportEnabled ? (
                            <MonteCarloCard
                              widgetId={item.i}
                              isEditing={isCardEditing}
                              meta={widget.meta}
                              onMetaChange={newMeta =>
                                onMetaChange(item, newMeta)
                              }
                            />
                          ) : null}
                        </ErrorBoundary>
                      </div>
                    );
                  })}
                </ReactGridLayout>
              )}
            </View>
          </div>
        </DashboardCaptureProvider>
      )}
    </Page>
  );
}
