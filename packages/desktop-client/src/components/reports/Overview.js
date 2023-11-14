import React from 'react';
import { useSelector } from 'react-redux';

import useFeatureFlag from '../../hooks/useFeatureFlag';
import AnimatedLoading from '../../icons/AnimatedLoading';
import { styles } from '../../style';
import View from '../common/View';

import CashFlowCard from './reports/CashFlowCard';
import CategorySpendingCard from './reports/CategorySpendingCard';
import CustomReportsCard from './reports/CustomCard';
import NetWorthCard from './reports/NetWorthCard';
import SankeyCard from './reports/SankeyCard';

export function LoadingIndicator() {
  return (
    <View
      style={{
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AnimatedLoading style={{ width: 25, height: 25 }} />
    </View>
  );
}

export default function Overview() {
  let categorySpendingReportFeatureFlag = useFeatureFlag(
    'categorySpendingReport',
  );
  let sankeyFeatureFlag = useFeatureFlag('sankeyReport');

  let customReportsFeatureFlag = useFeatureFlag('customReports');

  let accounts = useSelector(state => state.queries.accounts);
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
          <CustomReportsCard />
        ) : (
          <div style={{ flex: 1 }} />
        )}
        {!categorySpendingReportFeatureFlag && <div style={{ flex: 1 }} />}
        {!sankeyFeatureFlag && <div style={{ flex: 1 }} />}
      </View>
    </View>
  );
}
