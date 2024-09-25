import React from 'react';

import { theme, styles } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { LegendItem } from './LegendItem';
import { ReportOptions } from './ReportOptions';

type ReportLegendProps = {
  legend?: Array<{ name: string; color: string }>;
  groupBy: string;
  interval: string;
};

export function ReportLegend({ legend, groupBy, interval }: ReportLegendProps) {
  return (
    <View
      style={{
        backgroundColor: theme.pageBackground,
        alignItems: 'center',
        flex: 1,
        overflowY: 'auto',
      }}
    >
      <Text
        style={{
          ...styles.largeText,
          alignItems: 'center',
          marginBottom: 2,
          fontWeight: 400,
          paddingTop: 10,
        }}
      >
        {groupBy === 'Interval'
          ? ReportOptions.intervalMap.get(interval)
          : groupBy}
      </Text>
      <View>
        {legend &&
          legend.map(item => {
            return (
              <LegendItem
                key={item.name}
                color={item.color}
                label={item.name}
              />
            );
          })}
      </View>
    </View>
  );
}
