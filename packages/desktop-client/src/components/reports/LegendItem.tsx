import React from 'react';

import { Text } from '../common/Text';
import { View } from '../common/View';

export function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        paddingBottom: 10,
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
          backgroundColor: color,
        }}
      />
      <Text
        style={{
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
