import React from 'react';
import { Responsive, WidthProvider, type Layout } from 'react-grid-layout';
import { useLocation } from 'react-router-dom';

import { useDashboard } from 'loot-core/src/client/data-hooks/dashboard';
import { useReports } from 'loot-core/src/client/data-hooks/reports';
import {
  type CustomReportEntity,
  type CustomReportWidget,
  type Widget,
} from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
// import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useResponsive } from '../../ResponsiveProvider';
import { breakpoints } from '../../tokens';
import { Button } from '../common/Button2';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { MobilePageHeader, Page, PageHeader } from '../Page';

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

  const dashboardWidgets = widgets.map(widget => ({
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

  // Sort the layout by positioning (i.e top of the dashboard in first list items)
  const layout = [...dashboardWidgets, ...additionalWidgets].sort(
    (a, b) => a.y * 100 + a.x - (b.y * 100 + b.x),
  );

  // const lastWidget = layout[layout.length - 1];

  return layout;
  // TODO: re-consider the "add new widget" inline button
  // return [
  //   ...layout,
  //   {
  //     i: 'add-new-widget',
  //     type: 'add-new-widget',
  //     x: (lastWidget?.x + 4) % 12,
  //     y: lastWidget?.y + (lastWidget?.x + 4 > 12 ? 2 : 0),
  //     w: 4,
  //     h: 2,
  //     isDraggable: false,
  //     isResizable: false,
  //     meta: {},
  //   },
  // ];
}

export function Overview() {
  const { data: customReports, isLoading: isCustomReportsLoading } =
    useReports();
  const { data: widgets, isLoading: isWidgetsLoading } = useDashboard();

  const isLoading = isCustomReportsLoading || isWidgetsLoading;

  const { isNarrowWidth } = useResponsive();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  // const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  const layout = useWidgetLayout(widgets, customReports);

  // TODO: store in DB
  const onLayoutChange = console.log;

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
                    variant="primary"
                    onPress={() =>
                      alert('This functionality is not yet implemented')
                    }
                  >
                    Add new widget
                  </Button>
                  {/*
                  <Link variant="button" type="primary" to="/reports/custom">
                    Create new custom report
                  </Link>
                  *}
                  {/* TODO: should we have a reset button too? */}
                  {/* TODO: make this button work.. and think about how to improve the UI for it (icon maybe?) */}
                  <Button
                    onPress={() =>
                      alert('This functionality is not yet implemented')
                    }
                  >
                    Export/Import
                  </Button>
                </>
              )}
            </View>
          </View>
        )
      }
      padding={10}
      style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
    >
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
                <NetWorthCard accounts={accounts} />
              ) : item.type === 'cash-flow-card' ? (
                <CashFlowCard />
              ) : item.type === 'spending-card' ? (
                <SpendingCard />
              ) : item.type === 'custom-report' ? (
                // @ts-expect-error newer TS version should allow doing this
                <CustomReportListCards report={item.meta.report} />
              ) : null}
            </div>
          ))}

          {/* TODO: make the button work */}
          {/* TODO: do we need a button here? */}
          {/*
          <Button
            key="add-new-widget"
            variant="bare"
            style={{
              border: `2px dashed ${theme.buttonMenuBorder}`,
              opacity: 0.5,
              textAlign: 'center',
              justifyContent: 'center',
            }}
            onPress={() =>
              alert(
                'Clicking this button will allow to choose a widget type to add to the dashboard',
              )
            }
          >
            <View>
              <View style={{ fontSize: 50 }}>+</View>
              <Text style={{ fontSize: 20 }}>Add new widget</Text>
            </View>
          </Button>
          */}
        </ResponsiveGridLayout>
      </View>
    </Page>
  );
}
