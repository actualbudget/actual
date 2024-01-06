import React from 'react';

import { theme, styles } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';

type ReportLegendProps = {
  legend?: Array<{ name: string; color: string }>;
  groupBy: string;
};

export function ReportLegend({ legend, groupBy }: ReportLegendProps) {
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
        {groupBy}
      </Text>
      <View>
        {legend &&
          legend.map(item => {
            return (
              <View
                key={item.name}
                style={{
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    marginRight: 5,
                    borderRadius: 1000,
                    width: 14,
                    height: 14,
                    backgroundColor: item.color,
                  }}
                />
                <Text
                  style={{
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    flexShrink: 0,
                  }}
                >
                  {item.name}
                </Text>
              </View>
            );
          })}
      </View>
    </View>
  );
}
