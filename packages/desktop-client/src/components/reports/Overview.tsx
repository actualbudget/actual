import React from 'react';
import { useLocation } from 'react-router-dom';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useResponsive } from '../../ResponsiveProvider';
import { styles } from '../../style';
import { Button } from '../common/Button';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { View } from '../common/View';

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
    <View
      style={{
        ...styles.page,
        padding: 15,
        paddingTop: 0,
        minWidth: isNarrowWidth ? undefined : 700,
      }}
    >
      {customReportsFeatureFlag && !isNarrowWidth && (
        <View
          style={{
            flex: '0 0 auto',
            alignItems: 'flex-end',
            marginRight: 15,
            marginTop: 10,
          }}
        >
          <Link to="/reports/custom" style={{ textDecoration: 'none' }}>
            <Button type="primary">
              <Text>Create new custom report</Text>
            </Button>
          </Link>
        </View>
      )}
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
    </View>
  );
}
