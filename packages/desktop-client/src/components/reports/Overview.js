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
import Change from './Change';
import { chartTheme } from './chart-theme';
import Container from './Container';
import DateRange from './DateRange';
import { simpleCashFlow } from './graphs/cash-flow-spreadsheet';
import categorySpendingSpreadsheet from './graphs/category-spending-spreadsheet';
import CategorySpendingGraph from './graphs/CategorySpendingGraph';
import netWorthSpreadsheet from './graphs/net-worth-spreadsheet';
import NetWorthGraph from './graphs/NetWorthGraph';
import sankeySpreadsheet from './graphs/sankey-spreadsheet';
import SankeyGraph from './graphs/SankeyGraph';
import Tooltip from './Tooltip';
import useReport from './useReport';

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

function SankeyCard() {
  const { grouped: categoryGroups } = useCategories();
  const end = monthUtils.currentMonth();
  const start = monthUtils.subMonths(end, 5);

  const params = useMemo(
    () => sankeySpreadsheet(start, end, categoryGroups),
    [start, end, categoryGroups],
  );
  const data = useReport('sankey', params);

  return (
    <Card flex={1} to="/reports/sankey">
      <View style={{ flexDirection: 'row', padding: 20 }}>
        <View style={{ flex: 1 }}>
          <Block
            style={{ ...styles.mediumText, fontWeight: 500, marginBottom: 5 }}
            role="heading"
          >
            Sankey
          </Block>
          <DateRange start={start} end={end} />
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {data ? (
          <SankeyGraph data={data} compact={true} />
        ) : (
          <LoadingIndicator />
        )}
      </View>
    </Card>
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
        {customReportsFeatureFlag ? <CustomReportsCard /> : <div style={{ flex: 1 }} />}
		{!categorySpendingReportFeatureFlag && <div style={{ flex: 1 }} />}
		{!sankeyFeatureFlag && <div style={{ flex: 1 }} />}
      </View>
    </View>
  );
}
