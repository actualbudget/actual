import { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import ReactGridLayout from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  CustomReportWidget,
  DashboardPageEntity,
  DashboardWidgetEntity,
  ExportImportDashboard,
  MarkdownWidget,
} from 'loot-core/types/models';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSelector } from './DashboardSelector';
import { LoadingIndicator } from './LoadingIndicator';
import { BudgetAnalysisCard } from './reports/BudgetAnalysisCard';
import { CalendarCard } from './reports/CalendarCard';
import { CashFlowCard } from './reports/CashFlowCard';
import { CrossoverCard } from './reports/CrossoverCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { FormulaCard } from './reports/FormulaCard';
import { MarkdownCard } from './reports/MarkdownCard';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';
import './overview.scss';
import { SummaryCard } from './reports/SummaryCard';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import {
  useDashboardPages,
  useDashboardPageWidgets,
} from '@desktop-client/hooks/useDashboardPages';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useReports } from '@desktop-client/hooks/useReports';
import { useResizeObserver } from '@desktop-client/hooks/useResizeObserver';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useUndo } from '@desktop-client/hooks/useUndo';
import {
  addNotification,
  removeNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import {
  useAddDashboardWidgetMutation,
  useCopyDashboardWidgetMutation,
  useDeleteDashboardPageMutation,
  useImportDashboardPageMutation,
  useRemoveDashboardWidgetMutation,
  useResetDashboardPageMutation,
  useUpdateDashboardWidgetMutation,
  useUpdateDashboardWidgetsMutation,
} from '@desktop-client/reports/mutations';

function isCustomReportWidget(
  widget: DashboardWidgetEntity,
): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

type OverviewProps = {
  dashboard: DashboardPageEntity;
};

export function Overview({ dashboard }: OverviewProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';
  const crossoverReportEnabled = useFeatureFlag('crossoverReport');
  const budgetAnalysisReportEnabled = useFeatureFlag('budgetAnalysisReport');

  const formulaMode = useFeatureFlag('formulaMode');

  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const currentBreakpoint: 'mobile' | 'desktop' = isNarrowWidth
    ? 'mobile'
    : 'desktop';

  const { data: customReports = [], isPending: isCustomReportsLoading } =
    useReports();

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
      minW:
        isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 2 : 3,
      minH:
        isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 1 : 2,
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
        height: 2,
        meta,
        dashboard_page_id: dashboard.id,
      },
    });
  };

  const removeDashboardWidgetMutation = useRemoveDashboardWidgetMutation();

  const onRemoveWidget = (widgetId: string) => {
    removeDashboardWidgetMutation.mutate({ id: widgetId });
  };

  const onExport = () => {
    const data = {
      version: 1,
      widgets: desktopLayout.map(item => {
        const widget = widgetMap.get(item.i);

        if (!widget) {
          throw new Error(`Unable to query widget: ${item.i}`);
        }

        if (isCustomReportWidget(widget)) {
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

  const copyDashboardWidgetMutation = useCopyDashboardWidgetMutation();

  const onCopyWidget = (widgetId: string, targetDashboardId: string) => {
    copyDashboardWidgetMutation.mutate({
      id: widgetId,
      targetDashboardPageId: targetDashboardId,
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
              marginRight: 15,
              alignItems: 'center',
            }}
          >
            <DashboardHeader dashboard={dashboard} />

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
                            ...(crossoverReportEnabled
                              ? [
                                  {
                                    name: 'crossover-card' as const,
                                    text: t('Crossover point'),
                                  },
                                ]
                              : []),
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
                                  `Unrecognized menu option: ${item}`,
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
                      {widget.type === 'net-worth-card' ? (
                        <NetWorthCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          accounts={accounts}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'crossover-card' &&
                        crossoverReportEnabled ? (
                        <CrossoverCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          accounts={accounts}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'cash-flow-card' ? (
                        <CashFlowCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'spending-card' ? (
                        <SpendingCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'budget-analysis-card' &&
                        budgetAnalysisReportEnabled ? (
                        <BudgetAnalysisCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'markdown-card' ? (
                        <MarkdownCard
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'custom-report' ? (
                        <CustomReportListCards
                          isEditing={isEditing}
                          report={customReportMap.get(widget.meta.id)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'summary-card' ? (
                        <SummaryCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'calendar-card' ? (
                        <CalendarCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          firstDayOfWeekIdx={firstDayOfWeekIdx}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : widget.type === 'formula-card' && formulaMode ? (
                        <FormulaCard
                          widgetId={item.i}
                          isEditing={isEditing}
                          meta={widget.meta}
                          onMetaChange={newMeta => onMetaChange(item, newMeta)}
                          onRemove={() => onRemoveWidget(item.i)}
                          onCopy={targetDashboardId =>
                            onCopyWidget(item.i, targetDashboardId)
                          }
                        />
                      ) : null}
                    </div>
                  );
                })}
              </ReactGridLayout>
            )}
          </View>
        </div>
      )}
    </Page>
  );
}
