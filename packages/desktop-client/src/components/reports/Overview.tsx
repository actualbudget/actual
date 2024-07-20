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
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useResponsive } from '../../ResponsiveProvider';
import { breakpoints } from '../../tokens';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
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
): Layout[] {
  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');
  const widgetIds = new Set(
    widgets.map(widget =>
      isCustomReportWidget(widget) ? widget.meta.id : widget.type,
    ),
  );

  const layout = widgets.map(widget => ({
    i: isCustomReportWidget(widget) ? widget.meta.id : widget.type,
    x: widget.x,
    y: widget.y,
    w: widget.width,
    h: widget.height,
    minW: isCustomReportWidget(widget) ? 2 : 3,
    minH: isCustomReportWidget(widget) ? 1 : 2,
  }));

  // Calculate the max layout Y in order to know where to insert the missing
  // custom reports
  const trackingY = Math.max(...layout.map(({ y }) => y), 0) + 1;

  // Prepend newly created custom reports that have not yet been stored in
  // the dashboard table
  const additionalWidgets = customReports
    .filter(({ id }) => !widgetIds.has(id))
    .map(({ id }, idx) => ({
      i: id,
      x: (idx * 4) % 12,
      y: trackingY + (((idx + 1) * 4) % 12),
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
    }));

  // Prepend category spending report if it's not already there
  if (spendingReportFeatureFlag && !widgetIds.has('spending-card')) {
    additionalWidgets.push({
      i: 'spending-card',
      x: 0,
      y: Math.max(...additionalWidgets.map(({ y }) => y), 0) + 1,
      w: 4,
      h: 2,
      minW: 3,
      minH: 2,
    });
  }

  return [...layout, ...additionalWidgets];
}

export function Overview() {
  const { data: customReports, isLoading: isCustomReportsLoading } =
    useReports();
  const { data: widgets, isLoading: isWidgetsLoading } = useDashboard();

  const isLoading = isCustomReportsLoading || isWidgetsLoading;

  const { isNarrowWidth } = useResponsive();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

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
                  <Link variant="button" type="primary" to="/reports/custom">
                    Create new custom report
                  </Link>
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
          <div key="net-worth-card">
            <NetWorthCard accounts={accounts} />
          </div>
          <div key="cash-flow-card">
            <CashFlowCard />
          </div>
          {customReports.map(report => (
            <div key={report.id}>
              <CustomReportListCards report={report} />
            </div>
          ))}
          {spendingReportFeatureFlag && (
            <div key="spending-card">
              <SpendingCard />
            </div>
          )}
        </ResponsiveGridLayout>
      </View>
    </Page>
  );
}
