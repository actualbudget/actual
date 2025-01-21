import React, { useMemo, useRef, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import {
  addNotification,
  removeNotification,
} from 'loot-core/client/notifications/notificationsSlice';
import { useDashboard } from 'loot-core/src/client/data-hooks/dashboard';
import { useReports } from 'loot-core/src/client/data-hooks/reports';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  type CustomReportWidget,
  type ExportImportDashboard,
  type MarkdownWidget,
  type Widget,
} from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useNavigate } from '../../hooks/useNavigate';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useUndo } from '../../hooks/useUndo';
import { useDispatch } from '../../redux';
import { breakpoints } from '../../tokens';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { MenuButton } from '../common/MenuButton';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { MobilePageHeader, Page, PageHeader } from '../Page';
import { useResponsive } from '../responsive/ResponsiveProvider';

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

const ResponsiveGridLayout = WidthProvider(Responsive);

function isCustomReportWidget(widget: Widget): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

export function Overview() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [_firstDayOfWeekIdx] = useSyncedPref('firstDayOfWeekIdx');
  const firstDayOfWeekIdx = _firstDayOfWeekIdx || '0';

  const triggerRef = useRef(null);
  const extraMenuTriggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [extraMenuOpen, setExtraMenuOpen] = useState(false);
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

  const baseLayout = widgets.map(widget => ({
    i: widget.id,
    w: widget.width,
    h: widget.height,
    minW:
      isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 2 : 3,
    minH:
      isCustomReportWidget(widget) || widget.type === 'markdown-card' ? 1 : 2,
    ...widget,
  }));

  const layout = baseLayout;

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
    setMenuOpen(false);
  };

  const onRemoveWidget = (widgetId: string) => {
    send('dashboard-remove-widget', widgetId);
  };

  const onExport = () => {
    const widgetMap = new Map(widgets.map(item => [item.id, item]));

    const data = {
      version: 1,
      widgets: layout.map(item => {
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
      'Export Dashboard',
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
                  <Button
                    ref={triggerRef}
                    variant="primary"
                    isDisabled={isImporting}
                    onPress={() => setMenuOpen(true)}
                  >
                    <Trans>Add new widget</Trans>
                  </Button>

                  <Popover
                    triggerRef={triggerRef}
                    isOpen={menuOpen}
                    onOpenChange={() => setMenuOpen(false)}
                  >
                    <Menu
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
                  </Popover>

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

                  <MenuButton
                    ref={extraMenuTriggerRef}
                    onPress={() => setExtraMenuOpen(true)}
                  />
                  <Popover
                    triggerRef={extraMenuTriggerRef}
                    isOpen={extraMenuOpen}
                    onOpenChange={() => setExtraMenuOpen(false)}
                  >
                    <Menu
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
                        setExtraMenuOpen(false);
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
                  </Popover>
                </>
              )}
            </View>
          </View>
        )
      }
      padding={10}
      style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
    >
      {isImporting ? (
        <LoadingIndicator message={t('Import is running...')} />
      ) : (
        <View style={{ userSelect: 'none' }}>
          <ResponsiveGridLayout
            breakpoints={{ desktop: breakpoints.medium, mobile: 1 }}
            layouts={{ desktop: layout, mobile: layout }}
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
            {layout.map(item => (
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
      )}
    </Page>
  );
}
