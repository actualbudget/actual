import React from 'react';

import { useReports } from 'loot-core/src/client/data-hooks/reports';

import { useAccounts } from '../../hooks/useAccounts';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { theme, styles } from '../../style';
import { View } from '../common/View';

import { CashFlowCard } from './reports/CashFlowCard';
import { CustomReportCard } from './reports/CustomReportCard';
import { CustomReportListCards } from './reports/CustomReportListCards';
import { NetWorthCard } from './reports/NetWorthCard';
import { SankeyCard } from './reports/SankeyCard';

export function Overview() {
  const customReports = useReports();
  const sankeyFeatureFlag = useFeatureFlag('sankeyReport');

  const customReportsFeatureFlag = useFeatureFlag('customReports');

  const featureCount =
    3 - (sankeyFeatureFlag ? 1 : 0) - (customReportsFeatureFlag ? 1 : 0);
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
        {sankeyFeatureFlag && <SankeyCard />}
        {customReportsFeatureFlag && <CustomReportCard />}
        {featureCount !== 3 &&
          [...Array(featureCount)].map((e, i) => (
            <View key={i} style={{ padding: 15, flex: 1 }} />
          ))}
      </View>
      {customReportsFeatureFlag && (
        <>
          <View
            style={{
              height: 1,
              backgroundColor: theme.pillBorderDark,
              marginTop: 10,
              flexShrink: 0,
            }}
          />
          <CustomReportListCards reports={customReports} />
        </>
      )}
    </View>
  );
}
