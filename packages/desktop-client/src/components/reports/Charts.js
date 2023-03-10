import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Block,
  AlignedText,
  Select,
  Button,
} from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';
import ChartBar from 'loot-design/src/svg/v1/ChartBar';
import ChartPie from 'loot-design/src/svg/v1/ChartPie';

import Change from './Change';
import BarGraph from './graphs/BarGraph';
import BarLineGraph from './graphs/BarLineGraph';
import DonutGraph from './graphs/DonutGraph';
import LineGraph from './graphs/LineGraph';
import { TotalsTrends } from './Header';

const fontWeight = 600;

export function ChartItem({
  Icon,
  title,
  style,
  handleClick,
  bold,
  header,
  id,
  reportPage,
}) {
  const hoverStyle = {
    color: colors.b4,
    cursor: 'pointer',
    backgroundColor: 'inherit',
  };
  const linkStyle = [
    header && styles.largeText,
    {
      color: colors.n7,
      fontWeight: bold ? fontWeight : null,
    },
    { ':hover': hoverStyle },
  ];

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 16,
        color: reportPage === id ? colors.n3 : 'inherit',
      }}
    >
      {Icon && (
        <Icon id={id} width={12} height={12} style={{ color: 'inherit' }} />
      )}
      <Block id={id} style={{ marginLeft: Icon ? 3 : 0, color: 'inherit' }}>
        {title}
      </Block>
    </View>
  );

  return (
    <View style={[{ flexShrink: 0 }, style]}>
      <Button
        id={title + 'Button'}
        style={linkStyle}
        onClick={handleClick}
        bare
      >
        {content}
      </Button>
    </View>
  );
}

export function ChooseChartHeader({
  start,
  end,
  reportPage,
  secondaryReport,
  totalIncome,
  totalExpenses,
  totalChanges,
  netWorth,
  onSecondaryClick,
  selectList,
  handleChange,
}) {
  if (reportPage === 'CashFlow') {
    return (
      <View
        style={{
          paddingTop: 20,
          paddingRight: 20,
          flexShrink: 0,
          alignItems: 'flex-end',
          color: colors.n3,
        }}
      >
        <AlignedText
          style={{ marginBottom: 5, minWidth: 160 }}
          left={<Block>Income:</Block>}
          right={
            <Text style={{ fontWeight: 600 }}>
              {integerToCurrency(totalIncome)}
            </Text>
          }
        />
        <AlignedText
          style={{ marginBottom: 5, minWidth: 160 }}
          left={<Block>Expenses:</Block>}
          right={
            <Text style={{ fontWeight: 600 }}>
              {integerToCurrency(totalExpenses)}
            </Text>
          }
        />
        <Text style={{ fontWeight: 600 }}>
          <Change amount={totalIncome + totalExpenses} />
        </Text>
      </View>
    );
  } else if (reportPage === 'NetWorth') {
    return (
      <View style={{ textAlign: 'right', paddingRight: 20, flexShrink: 0 }}>
        <View style={[styles.largeText, { fontWeight: 400, marginBottom: 5 }]}>
          {integerToCurrency(netWorth)}
        </View>
        <Change amount={totalChanges} />
      </View>
    );
  } else if (reportPage === 'IE') {
    return (
      <View
        style={{
          flexDirection: 'row',
        }}
      >
        <TotalsTrends
          title="Totals"
          id="Totals"
          secondaryReport={secondaryReport}
          Chart={ChartPie}
          onSecondaryClick={onSecondaryClick}
        />
        <TotalsTrends
          title="Trends"
          id="Trends"
          secondaryReport={secondaryReport}
          Chart={ChartBar}
          onSecondaryClick={onSecondaryClick}
        />
        <View
          style={{
            color: colors.n3,
            alignItems: 'center',
            height: 16,
            marginLeft: 20,
            marginTop: -2,
          }}
        >
          <Select
            style={{ flex: 0, backgroundColor: 'white' }}
            value={selectList}
            onChange={handleChange}
          >
            <option value={'Expense'}>Expense</option>
            <option value={'Income'}>Income</option>
            {secondaryReport === 'Trends' && <option value={'All'}>All</option>}
          </Select>
        </View>
      </View>
    );
  }
}

export function ChooseChart({
  start,
  end,
  endDay,
  graphData,
  catData,
  isConcise,
  selectList,
  reportPage,
  secondaryReport,
}) {
  if (reportPage === 'CashFlow') {
    return (
      <BarLineGraph
        start={start}
        end={endDay}
        graphData={graphData}
        isConcise={isConcise}
      />
    );
  } else if (reportPage === 'NetWorth') {
    return (
      <LineGraph
        start={monthUtils.getMonth(start)}
        end={end}
        graphData={graphData}
      />
    );
  } else if (reportPage === 'IE') {
    if (secondaryReport === 'Totals') {
      return (
        <View style={{ alignItems: 'center' }}>
          <DonutGraph
            start={monthUtils.getMonth(start)}
            end={end}
            graphData={
              selectList === 'Expense' ? catData.expenses : catData.income
            }
          />
        </View>
      );
    } else if (selectList === 'All') {
      return (
        <View>
          <BarGraph
            start={start}
            end={end}
            graphDataExp={graphData.expenses}
            graphDataInc={graphData.income}
            selectList={selectList}
          />
        </View>
      );
    } else {
      return (
        <View>
          <BarGraph
            start={start}
            end={end}
            graphDataExp={graphData.change}
            selectList={selectList}
          />
        </View>
      );
    }
  }
}

export function ChartExtraColumn({
  start,
  end,
  totalExpenses,
  totalIncome,
  reportPage,
  selectList,
}) {
  let amt =
    selectList === 'Expense'
      ? totalExpenses
      : selectList === 'Income'
      ? totalIncome
      : totalExpenses + totalIncome;
  let net = totalExpenses > totalIncome ? 'EXPENSE' : 'INCOME';
  if (reportPage === 'IE') {
    return (
      <View
        style={{
          padding: 15,
          overflow: 'auto',
          flexDirection: 'column',
          flex: 1,
          marginTop: 15,
          marginRight: 30,
          marginLeft: 10,
        }}
      >
        <View
          style={{
            backgroundColor: colors.n11,
            height: 100,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={[
              styles.largeText,
              {
                alignItems: 'center',
                marginBottom: 2,
                fontWeight: 600,
              },
            ]}
          >
            {monthUtils.format(start, 'MMM yyyy')} -{' '}
            {monthUtils.format(end, 'MMM yyyy')}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: colors.n11,
            height: 100,
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <Text
            style={[
              styles.mediumText,
              {
                alignItems: 'center',
                marginBottom: 2,
                fontWeight: 400,
              },
            ]}
          >
            {selectList === 'Expense'
              ? 'TOTAL SPENDING'
              : selectList === 'Income'
              ? 'TOTAL INCOME'
              : 'NET ' + net}
          </Text>
          <Text
            style={[
              styles.veryLargeText,
              {
                alignItems: 'center',
                marginBottom: 2,
                fontWeight: 800,
              },
            ]}
          >
            {integerToCurrency(amt)}
          </Text>
          <Text style={{ fontWeight: 600 }}>For this time period</Text>
        </View>
        <View
          style={{
            backgroundColor: colors.n11,
            paddingTop: 10,
            alignItems: 'center',
            marginTop: 10,
            flex: 1,
            display: 'none',
          }}
        >
          <Text //thinking of using this space for a VictoryLegend if needed
            style={[
              styles.largeText,
              {
                alignItems: 'center',
                marginBottom: 2,
                fontWeight: 400,
              },
            ]}
          >
            Categories
          </Text>
        </View>
      </View>
    );
  } else {
    return <View style={{ flex: 0 }} />;
  }
}
