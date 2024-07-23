import React, { useRef, useState } from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { addNotification } from 'loot-core/src/client/actions';

import { useDashboard } from 'loot-core/src/client/data-hooks/dashboard';
import { useReports } from 'loot-core/src/client/data-hooks/reports';
import { send } from 'loot-core/src/platform/client/fetch';
import {
  type CustomReportEntity,
  type CustomReportWidget,
  type ExportImportDashboard,
  type SpecializedWidget,
  type Widget,
} from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { breakpoints } from '../../tokens';
import { Button, ButtonWithLoading } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { MobilePageHeader, Page, PageHeader } from '../Page';

import { LoadingIndicator } from './LoadingIndicator';
import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';

import './overview.scss';

type MenuItem = {
  name: Widget['type'];
  text: string;
};

const ResponsiveGridLayout = WidthProvider(Responsive);

function isCustomReportWidget(widget: Widget): widget is CustomReportWidget {
  return widget.type === 'custom-report';
}

function useWidgetLayout(
  widgets: Widget[],
  customReports: CustomReportEntity[],
): (Layout &
  (
    | {
        type: Omit<Widget['type'], CustomReportWidget['type']>;
        meta: {};
      }
    | {
        type: CustomReportWidget['type'];
        meta: {
          report: CustomReportEntity;
        };
      }
  ))[] {
  const usedCustomReportIds = new Set(
    widgets.filter(isCustomReportWidget).map(widget => widget.meta.id),
  );
  const customReportMap = new Map(
    customReports.map(report => [report.id, report]),
  );

  const dashboardWidgets = widgets
    .filter(
      widget =>
        !isCustomReportWidget(widget) ||
        // Edge case: remove widgets referencing non-existing custom reports
        customReportMap.has(widget.meta.id),
    )
    .map(widget => ({
      i: widget.id,
      type: widget.type,
      x: widget.x,
      y: widget.y,
      w: widget.width,
      h: widget.height,
      minW: isCustomReportWidget(widget) ? 2 : 3,
      minH: isCustomReportWidget(widget) ? 1 : 2,
      meta: isCustomReportWidget(widget)
        ? { report: customReportMap.get(widget.meta.id) }
        : {},
    }));

  // Calculate the max layout Y in order to know where to insert the missing
  // custom reports
  const trackingY = Math.max(...dashboardWidgets.map(({ y }) => y), 0) + 2;

  // Prepend newly created custom reports that have not yet been stored in
  // the dashboard table
  const additionalWidgets = customReports
    .filter(({ id }) => !usedCustomReportIds.has(id))
    .map((report, idx) => ({
      i: report.id,
      type: 'custom-report' as const,
      x: (idx * 4) % 12,
      y: trackingY + Math.floor(idx / 3) * 2,
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
      meta: { report },
    }));

  return [...dashboardWidgets, ...additionalWidgets];
}

export function Overview() {
  const dispatch = useDispatch();

  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { data: customReports, isLoading: isCustomReportsLoading } =
    useReports();
  const { data: widgets, isLoading: isWidgetsLoading } = useDashboard();

  const isLoading = isCustomReportsLoading || isWidgetsLoading;

  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  const layout = useWidgetLayout(widgets, customReports);

  const onLayoutChange = (newLayout: Layout[]) => {
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

  const onAddWidget = (type: SpecializedWidget['type']) => {
    send('dashboard-add-widget', {
      type,
      width: 4,
      height: 2,
      meta: null,
    });
    setMenuOpen(false);
  };

  const onRemoveWidget = (widgetId: string) => {
    send('dashboard-remove-widget', widgetId);
  };

  const onExport = () => {
    const widgetMap = new Map(layout.map(item => [item.i, item]));

    const data = {
      version: 1,
      widgets: layout
        .map(item => widgetMap.get(item.i))
        .map(item => ({
          id: item.i,
          type: item.type,
          width: item.w,
          height: item.h,
          x: item.x,
          y: item.y,
          meta:
            item.type === 'custom-report'
              ? {
                  ...item.meta.report,
                  data: undefined,
                  selectedCategories: undefined,
                }
              : undefined,
        })),
    } satisfies ExportImportDashboard;

    window.Actual?.saveFile(
      JSON.stringify(data, null, 2),
      'dashboard.json',
      'Export Dashboard',
    );
  };
  const onImport = async () => {
    const [filepath] = await window.Actual?.openFileDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'JSON files',
          extensions: ['json'],
        },
      ],
    });

    setIsImporting(true);
    const res = await send('dashboard-import', { filepath });
    setIsImporting(false);

    if (res.error) {
      dispatch(
        addNotification({
          type: 'error',
          message: 'Failed importing the dashboard file.',
        }),
      );
    }
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
              {!isNarrowWidth && (
                <>
                  <Button
                    ref={triggerRef}
                    variant="primary"
                    isDisabled={isImporting}
                    onPress={() => setMenuOpen(true)}
                  >
                    Add new widget
                  </Button>

                  <Popover
                    triggerRef={triggerRef}
                    isOpen={menuOpen}
                    onOpenChange={() => setMenuOpen(false)}
                  >
                    <Menu<MenuItem>
                      onMenuSelect={item => {
                        if (item === 'custom-report') {
                          navigate('/reports/custom');
                          return;
                        }
                        onAddWidget(item);
                      }}
                      items={[
                        {
                          name: 'cash-flow-card' as const,
                          text: 'Cash Flow graph',
                        },
                        {
                          name: 'net-worth-card' as const,
                          text: 'Net Worth graph',
                        },
                        ...(spendingReportFeatureFlag
                          ? [
                              {
                                name: 'spending-card' as const,
                                text: 'Spending Analysis',
                              },
                            ]
                          : []),
                        {
                          name: 'custom-report' as const,
                          text: 'Custom Report',
                        },
                      ]}
                    />
                  </Popover>

                  {/* TODO: should we have a reset button too? */}
                  <Button isDisabled={isImporting} onPress={onExport}>
                    Export
                  </Button>
                  <ButtonWithLoading isLoading={isImporting} onPress={onImport}>
                    Import
                  </ButtonWithLoading>
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
            breakpoints={{ desktop: breakpoints.medium, mobile: 0 }}
            layouts={{ desktop: layout, mobile: layout }}
            onLayoutChange={onLayoutChange}
            cols={{ desktop: 12, mobile: 1 }}
            rowHeight={100}
            draggableHandle=".draggable-handle"
          >
            {layout.map(item => (
              <div key={item.i}>
                {item.type === 'net-worth-card' ? (
                  <NetWorthCard
                    accounts={accounts}
                    onRemove={() => onRemoveWidget(item.i)}
                  />
                ) : item.type === 'cash-flow-card' ? (
                  <CashFlowCard onRemove={() => onRemoveWidget(item.i)} />
                ) : item.type === 'spending-card' ? (
                  <SpendingCard onRemove={() => onRemoveWidget(item.i)} />
                ) : item.type === 'custom-report' ? (
                  // @ts-expect-error newer TS version should allow doing this
                  <CustomReportListCards
                    report={item.meta.report}
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
