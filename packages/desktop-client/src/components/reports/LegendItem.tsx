import React from 'react';
import type { CSSProperties } from 'react';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

export function LegendItem({
  color,
  label,
  style,
}: {
  color: string;
  label: string;
  style?: CSSProperties;
}) {
  return (
    <View
      style={{
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        ...style,
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
