import React, { useMemo, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { breakpoints } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import {
  type CustomReportWidget,
  type ExportImportDashboard,
  type MarkdownWidget,
  type Widget,
} from 'loot-core/types/models';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';
import { LoadingIndicator } from './LoadingIndicator';
import { CalendarCard } from './reports/CalendarCard';
import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { MarkdownCard } from './reports/MarkdownCard';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';
import './overview.scss';
import { SummaryCard } from './reports/SummaryCard';

import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import {
  MobilePageHeader,
  Page,
  PageHeader,
} from '@desktop-client/components/Page';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useDashboard } from '@desktop-client/hooks/useDashboard';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useReports } from '@desktop-client/hooks/useReports';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useUndo } from '@desktop-client/hooks/useUndo';
import {
  addNotification,
  removeNotification,
} from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';

const ResponsiveGridLayout = WidthProvider(Responsive);

function isCustomReportWidget(widget: Widget): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

export function Overview() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<
    'mobile' | 'desktop'
  >('desktop');

  const { data: customReports, isLoading: isCustomReportsLoading } =
    useReports();
  const { data: widgets, isLoading: isWidgetsLoading } = useDashboard();

  const customReportMap = useMemo(
    () => new Map(customReports.map(report => [report.id, report])),
    [customReports],
  );

  const isLoading = isCustomReportsLoading || isWidgetsLoading;

  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

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
        ...widget,
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
      w: widget.width,
      h: widget.height,
      minW:
        isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 2 : 3,
      minH:
        isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 1 : 2,
      ...widget,
    }));
  }, [widgets]);

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

  const onBreakpointChange = (breakpoint: 'mobile' | 'desktop') => {
    setCurrentBreakpoint(breakpoint);
  };

  const onResetDashboard = async () => {
    setIsImporting(true);
    await send('dashboard-reset');
    setIsImporting(false);

    onDispatchSucessNotification(
      t(
        'Dashboard has been successfully reset to default state. Don’t like what you see? You can always press [ctrl+z](#undo) to undo.',
      ),
    );
  };

  const onLayoutChange = (newLayout: Layout[]) => {
    if (!isEditing) {
      return;
    }

    send(
      'dashboard-update',
      newLayout.map(item => ({
        id: item.i,
        width: item.w,
        height: item.h,
        x: item.x,
        y: item.y,
      })),
    );
  };

  const onAddWidget = <T extends Widget>(
    type: T['type'],
    meta: T['meta'] = null,
  ) => {
    send('dashboard-add-widget', {
      type,
      width: 4,
      height: 2,
      meta,
    });
  };

  const onRemoveWidget = (widgetId: string) => {
    send('dashboard-remove-widget', widgetId);
  };

  const onExport = () => {
    const widgetMap = new Map(widgets.map(item => [item.id, item]));

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

    window.Actual.saveFile(
      JSON.stringify(data, null, 2),
      'dashboard.json',
      t('Export Dashboard'),
    );
  };
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

    const [filepath] = await openFileDialog({
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
    const res = await send('dashboard-import', { filepath });
    setIsImporting(false);

    if ('error' in res) {
      switch (res.error) {
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
                message: res.message,
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
      return;
    }

    onDispatchSucessNotification(
      t(
        'Dashboard has been successfully imported. Don’t like what you see? You can always press [ctrl+z](#undo) to undo.',
      ),
    );
  };

  const onMetaChange = (widget: { i: string }, newMeta: Widget['meta']) => {
    send('dashboard-update-widget', {
      id: widget.i,
      meta: newMeta,
    });
  };

  const accounts = useAccounts();

  if (isLoading) {
    return <LoadingIndicator message={t('Loading reports...')} />;
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader title={t('Reports')} />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginRight: 15,
            }}
          >
            <PageHeader title={t('Reports')} />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 5,
              }}
            >
              {currentBreakpoint === 'desktop' && (
                <>
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
                              navigate('/reports/custom');
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
                              name: 'spending-card' as const,
                              text: t('Spending analysis'),
                            },
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
                                onResetDashboard();
                                break;
                              case 'export':
                                onExport();
                                break;
                              case 'import':
                                onImport();
                                break;
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
            style={{ userSelect: 'none', paddingBottom: MOBILE_NAV_HEIGHT }}
          >
            <ResponsiveGridLayout
              breakpoints={{ desktop: breakpoints.medium, mobile: 1 }}
              layouts={{ desktop: desktopLayout, mobile: mobileLayout }}
              onLayoutChange={
                currentBreakpoint === 'desktop' ? onLayoutChange : undefined
              }
              onBreakpointChange={onBreakpointChange}
              cols={{ desktop: 12, mobile: 1 }}
              rowHeight={100}
              draggableCancel={`.${NON_DRAGGABLE_AREA_CLASS_NAME}`}
              isDraggable={currentBreakpoint === 'desktop' && isEditing}
              isResizable={currentBreakpoint === 'desktop' && isEditing}
            >
              {desktopLayout.map(item => (
                <div key={item.i}>
                  {item.type === 'net-worth-card' ? (
                    <NetWorthCard
                      widgetId={item.i}
                      isEditing={isEditing}
                      accounts={accounts}
                      meta={item.meta}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'cash-flow-card' ? (
                    <CashFlowCard
                      widgetId={item.i}
                      isEditing={isEditing}
                      meta={item.meta}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'spending-card' ? (
                    <SpendingCard
                      widgetId={item.i}
                      isEditing={isEditing}
                      meta={item.meta}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'markdown-card' ? (
                    <MarkdownCard
                      isEditing={isEditing}
                      meta={item.meta}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'custom-report' ? (
                    <CustomReportListCards
                      isEditing={isEditing}
                      report={customReportMap.get(item.meta.id)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'summary-card' ? (
                    <SummaryCard
                      widgetId={item.i}
                      isEditing={isEditing}
                      meta={item.meta}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : item.type === 'calendar-card' ? (
                    <CalendarCard
                      widgetId={item.i}
                      isEditing={isEditing}
                      meta={item.meta}
                      firstDayOfWeekIdx={firstDayOfWeekIdx}
                      onMetaChange={newMeta => onMetaChange(item, newMeta)}
                      onRemove={() => onRemoveWidget(item.i)}
                    />
                  ) : null}
                </div>
              ))}
            </ResponsiveGridLayout>
          </View>
        </div>
      )}
    </Page>
  );
}
