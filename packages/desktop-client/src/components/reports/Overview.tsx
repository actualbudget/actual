import React from 'react';
import { useLocation } from 'react-router-dom';

import { css } from 'glamor';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useNavigate } from '../../hooks/useNavigate';
import { useResponsive } from '../../ResponsiveProvider';
import { Button } from '../common/Button2';
import { View } from '../common/View';
import { MOBILE_NAV_HEIGHT } from '../mobile/MobileNavTabs';
import { MobilePageHeader, Page, PageHeader } from '../Page';

import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { NetWorthCard } from './reports/NetWorthCard';
import { SpendingCard } from './reports/SpendingCard';

export function Overview() {
  const { data: customReports } = useReports();
  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();

  const location = useLocation();
  sessionStorage.setItem('url', location.pathname);

  const spendingReportFeatureFlag = useFeatureFlag('spendingReport');

  const accounts = useAccounts();
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
            {!isNarrowWidth && (
              <Button
                variant="primary"
                onPress={() => navigate('/reports/custom')}
              >
                Create new custom report
              </Button>
            )}
          </View>
        )
      }
      padding={0}
      style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
    >
      <View
        className={`${css({
          flex: '0 0 auto',
          flexDirection: isNarrowWidth ? 'column' : 'row',
          flexWrap: isNarrowWidth ? 'nowrap' : 'wrap',
          padding: '10',
          '> a, > div': {
            margin: '10',
          },
        })}`}
      >
        <NetWorthCard accounts={accounts} />
        <CashFlowCard />
        {spendingReportFeatureFlag && <SpendingCard />}
        <CustomReportListCards reports={customReports} />
      </View>
    </Page>
  );
}
