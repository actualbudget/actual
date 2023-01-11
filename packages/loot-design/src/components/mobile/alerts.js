import React from 'react';
import { View, Text } from 'react-native';

import { styles, colors } from 'loot-design/src/style';
import InformationSolid from 'loot-design/src/svg/v1/InformationOutline';

export function Information({ style, children }) {
  return (
    <View
      style={[
        {
          fontSize: 13,
          ...styles.shadow,
          borderRadius: 4,
          backgroundColor: colors.b10,
          padding: 10,
          flexDirection: 'row'
        },
        style
      ]}
    >
      <View
        style={{
          paddingLeft: 2,
          paddingTop: 1,
          alignSelf: 'stretch',
          flexShrink: 0,
          marginRight: 5
        }}
      >
        <InformationSolid
          width={13}
          height={13}
          style={{ color: colors.b2, marginTop: 2 }}
        />
      </View>
      <Text
        style={{ color: colors.b2, flex: 1, flexWrap: 'wrap', lineHeight: 20 }}
      >
        {children}
      </Text>
    </View>
  );
}
