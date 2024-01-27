import React from 'react';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { styles } from '../../style';
import { View } from '../common/View';

import { CashFlowCard } from './reports/CashFlowCard';
import { CategorySpendingCard } from './reports/CategorySpendingCard';
import { CustomReportCard } from './reports/CustomReportCard';
import { NetWorthCard } from './reports/NetWorthCard';
import { SankeyCard } from './reports/SankeyCard';

export function Overview() {
  const customReports = useReports();
  const categorySpendingReportFeatureFlag = useFeatureFlag(
    'categorySpendingReport',
  );
  const sankeyFeatureFlag = useFeatureFlag('sankeyReport');

  const customReportsFeatureFlag = useFeatureFlag('customReports');

  const accounts = useAccounts();
  return (
    <View
      style={{
        ...styles.page,
        ...{ paddingLeft: 40, paddingRight: 40, minWidth: 700 },
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          flex: '0 0 auto',
        }}
      >
        <NetWorthCard accounts={accounts} />
        <CashFlowCard />
      </View>
      <View
        style={{
          flex: '0 0 auto',
          flexDirection: 'row',
        }}
      >
        {categorySpendingReportFeatureFlag && <CategorySpendingCard />}
        {sankeyFeatureFlag && <SankeyCard />}
        {customReportsFeatureFlag ? (
          <CustomReportCard reports={customReports} />
        ) : (
          <div style={{ flex: 1 }} />
        )}
        {!categorySpendingReportFeatureFlag && <div style={{ flex: 1 }} />}
        {!sankeyFeatureFlag && <div style={{ flex: 1 }} />}
      </View>
    </View>
  );
}
