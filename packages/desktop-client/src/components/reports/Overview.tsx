import React from 'react';
import { useLocation } from 'react-router-dom';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useResponsive } from '../../ResponsiveProvider';
import { Button } from '../common/Button';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { Page, PageHeader } from '../Page';

import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';

export function Overview() {
  const customReports = useReports();
  const { isNarrowWidth } = useResponsive();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const customReportsFeatureFlag = useFeatureFlag('customReports');
  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  const accounts = useAccounts();
  return (
    <Page
      header={
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginRight: 15,
          }}
        >
          <PageHeader title="Reports" />
          {customReportsFeatureFlag && !isNarrowWidth && (
            <Link to="/reports/custom" style={{ textDecoration: 'none' }}>
              <Button type="primary">
                <Text>Create new custom report</Text>
              </Button>
            </Link>
          )}
        </View>
      }
      padding={0}
      style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
    >
      <View
        style={{
          flexDirection: isNarrowWidth ? 'column' : 'row',
          flex: '0 0 auto',
        }}
      >
        <NetWorthCard accounts={accounts} />
        <CashFlowCard />
        {spendingReportFeatureFlag && <SpendingCard />}
      </View>
      {customReportsFeatureFlag && (
        <CustomReportListCards reports={customReports} />
      )}
    </Page>
  );
}
