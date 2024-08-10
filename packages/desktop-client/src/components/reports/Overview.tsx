import React, { useMemo, useRef, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import {
  addNotification,
  removeNotification,
} from 'loot-core/src/client/actions';
import { useDashboard } from 'loot-core/src/client/data-hooks/dashboard';
import { useReports } from 'loot-core/src/client/data-hooks/reports';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  type CustomReportWidget,
  type ExportImportDashboard,
  type Widget,
} from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { breakpoints } from '../../tokens';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { MenuButton } from '../common/MenuButton';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { MobilePageHeader, Page, PageHeader } from '../Page';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';
import { LoadingIndicator } from './LoadingIndicator';
import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';

import './overview.scss';

const ResponsiveGridLayout = WidthProvider(Responsive);

function isCustomReportWidget(widget: Widget): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

function useWidgetLayout(widgets: Widget[]): (Layout & {
  type: Widget['type'];
  meta: Widget['meta'];
})[] {
  return widgets.map(widget => ({
    i: widget.id,
    type: widget.type,
    x: widget.x,
    y: widget.y,
    w: widget.width,
    h: widget.height,
    minW: isCustomReportWidget(widget) ? 2 : 3,
    minH: isCustomReportWidget(widget) ? 1 : 2,
    meta: widget.meta,
  }));
}

export function Overview() {
  const dispatch = useDispatch();

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

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  const layout = useWidgetLayout(widgets);

  const closeNotifications = () => {
    dispatch(removeNotification('import'));
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

  const onDispatchSucessNotification = (message: string) => {
    dispatch(
      addNotification({
        id: 'import',
        type: 'message',
        sticky: true,
        timeout: 30_000, // 30s
        message,
        messageActions: {
          undo: () => {
            closeNotifications();
            window.__actionsForMenu.undo();
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
      'Dashboard has been successfully reset to default state. Don’t like what you see? You can always press [ctrl+z](#undo) to undo.',
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

    window.Actual?.saveFile(
      JSON.stringify(data, null, 2),
      'dashboard.json',
      'Export Dashboard',
    );
  };
  const onImport = async () => {
    const openFileDialog = window.Actual?.openFileDialog;

    if (!openFileDialog) {
      dispatch(
        addNotification({
          type: 'error',
          message: 'Fatal error occurred: unable to open import file dialog.',
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

    if (res.error) {
      switch (res.error) {
        case 'json-parse-error':
          dispatch(
            addNotification({
              id: 'import',
              type: 'error',
              message: 'Failed parsing the imported JSON.',
            }),
          );
          break;

        case 'validation-error':
          dispatch(
            addNotification({
              id: 'import',
              type: 'error',
              message: res.message,
            }),
          );
          break;

        default:
          dispatch(
            addNotification({
              id: 'import',
              type: 'error',
              message: 'Failed importing the dashboard file.',
            }),
          );
          break;
      }
      return;
    }

    onDispatchSucessNotification(
      'Dashboard has been successfully imported. Don’t like what you see? You can always press [ctrl+z](#undo) to undo.',
    );
  };

  const accounts = useAccounts();

  if (isLoading) {
    return <LoadingIndicator message="Loading reports..." />;
  }

  return (
    <Page
      header={
        isNarrowWidth ? (
          <MobilePageHeader title="Reports" />
        ) : (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginRight: 15,
            }}
          >
            <PageHeader title="Reports" />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 5,
              }}
            >
              {currentBreakpoint === 'desktop' && (
                <>
                  {isEditing ? (
                    <>
                      <Button
                        ref={triggerRef}
                        variant="primary"
                        isDisabled={isImporting}
                        onPress={() => setMenuOpen(true)}
                      >
                        Add new widget
                      </Button>
                      <Button
                        isDisabled={isImporting}
                        onPress={() => setIsEditing(false)}
                      >
                        Finish editing dashboard
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
                              onAddWidget('custom-report', { id: reportId });
                              return;
                            }

                            onAddWidget(item);
                          }}
                          items={[
                            {
                              name: 'cash-flow-card' as const,
                              text: 'Cash flow graph',
                            },
                            {
                              name: 'net-worth-card' as const,
                              text: 'Net worth graph',
                            },
                            ...(spendingReportFeatureFlag
                              ? [
                                  {
                                    name: 'spending-card' as const,
                                    text: 'Spending analysis',
                                  },
                                ]
                              : []),
                            {
                              name: 'custom-report' as const,
                              text: 'New custom report',
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
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        isDisabled={isImporting}
                        onPress={() => navigate('/reports/custom')}
                      >
                        Create new custom report
                      </Button>
                      <Button
                        isDisabled={isImporting}
                        onPress={() => setIsEditing(true)}
                      >
                        Edit dashboard
                      </Button>
                    </>
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
                          text: 'Reset to default',
                          disabled: isImporting,
                        },
                        Menu.line,
                        {
                          name: 'import',
                          text: 'Import',
                          disabled: isImporting,
                        },
                        {
                          name: 'export',
                          text: 'Export',
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
        <LoadingIndicator message="Import is running..." />
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
                    isEditing={isEditing}
                    accounts={accounts}
                    onRemove={() => onRemoveWidget(item.i)}
                  />
                ) : item.type === 'cash-flow-card' ? (
                  <CashFlowCard
                    isEditing={isEditing}
                    onRemove={() => onRemoveWidget(item.i)}
                  />
                ) : item.type === 'spending-card' ? (
                  <SpendingCard
                    isEditing={isEditing}
                    onRemove={() => onRemoveWidget(item.i)}
                  />
                ) : item.type === 'custom-report' ? (
                  <CustomReportListCards
                    isEditing={isEditing}
                    report={
                      item.meta && 'id' in item.meta
                        ? customReportMap.get(item.meta.id)
                        : undefined
                    }
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
