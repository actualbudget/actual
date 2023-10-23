import React from 'react';
import { useSelector } from 'react-redux';

import useFeatureFlag from '../../hooks/useFeatureFlag';
import { styles } from '../../style';
import View from '../common/View';

import { CashFlowCard } from './CashFlow';
import { CategorySpendingCard } from './CategorySpending';
import { NetWorthCard } from './NetWorth';

export default function Overview() {
  let categorySpendingReportFeatureFlag = useFeatureFlag(
    'categorySpendingReport',
  );

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

      {categorySpendingReportFeatureFlag && (
        <View
          style={{
            flex: '0 0 auto',
            flexDirection: 'row',
          }}
        >
          <CategorySpendingCard />
          <div style={{ flex: 1 }} />
          <div style={{ flex: 1 }} />
        </View>
      )}
    </View>
  );
}
