import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useLocation } from 'react-router-dom';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

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

export function Overview() {
  const { data: customReports, isLoading: isCustomReportsLoading } =
    useReports();
  const { isNarrowWidth } = useResponsive();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  // TODO: retrieve from DB
  const layout = [
    { i: 'cash-flow-card', x: 6, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    { i: 'net-worth-card', x: 0, y: 0, w: 6, h: 2, minW: 3, minH: 2 },
    ...customReports.reverse().map((report, id) => ({
      i: report.id,
      x: (id * 4) % 12,
      y: ((id + 1) * 4) % 12,
      w: 4,
      h: 2,
      minW: 2,
      minH: 1,
    })),
    ...(spendingReportFeatureFlag
      ? [
          {
            i: 'spending-card',
            x: 99,
            y: 99,
            w: 6,
            h: 2,
            minW: 3,
            minH: 2,
          },
        ]
      : []),
  ];
  const layouts = { desktop: layout, mobile: layout };

  // TODO: store in DB
  const onLayoutChange = console.log;

  const accounts = useAccounts();

  if (isCustomReportsLoading) {
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
          layouts={layouts}
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
          {spendingReportFeatureFlag && (
            <div key="spending-card">
              <SpendingCard />
            </div>
          )}
          {customReports.map(report => (
            <div key={report.id}>
              <CustomReportListCards report={report} />
            </div>
          ))}
        </ResponsiveGridLayout>
      </View>
    </Page>
  );
}
