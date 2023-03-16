import React from 'react';

import * as monthUtils from 'loot-core/src/shared/months';
import { integerToCurrency } from 'loot-core/src/shared/util';
import { View, Text, Block, Button } from 'loot-design/src/components/common';
import { colors, styles } from 'loot-design/src/style';

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
    cursor: 'pointer',
    backgroundColor: colors.n9,
  };
  const linkStyle = [
    header && styles.largeText,
    {
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
      }}
    >
      {Icon && (
        <Icon width={12} height={12} style={{ color: 'inherit' }} />
      )}
      <Block style={{ marginLeft: Icon ? 3 : 0, color: 'inherit' }}>
        {title}
      </Block>
    </View>
  );

  return (
    <View style={[{ flexShrink: 0 }, style]}>
      <Button
        style={linkStyle}
        onClick={() => handleClick(id)}
        bare
      >
        {content}
      </Button>
    </View>
  );
}

export function ChartExtraColumn({
  start,
  end,
  totalExpenses,
  totalIncome,
  selectList,
}) {
  let amt =
    selectList === 'Expense'
      ? totalExpenses
      : selectList === 'Income'
      ? totalIncome
      : totalExpenses + totalIncome;
  let net = totalExpenses > totalIncome ? 'EXPENSE' : 'INCOME';
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
}
