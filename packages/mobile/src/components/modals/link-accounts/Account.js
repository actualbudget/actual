import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import { colors, mobileStyles as styles } from 'loot-design/src/style';
import {
  fromPlaidAccountType,
  prettyAccountType
} from 'loot-core/src/shared/accounts';

export default function Account({ account, style, rightContent, onPress }) {
  return (
    <View
      style={[
        styles.shadow,
        {
          backgroundColor: 'white',
          marginBottom: 15,
          borderRadius: 6
        },
        style
      ]}
    >
      <RectButton onPress={onPress} style={{ borderRadius: 6 }}>
        <View
          style={[{ padding: 12, flexDirection: 'row', alignItems: 'center' }]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.text, { fontWeight: '500' }]}>
                {account.name}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <Text
                style={{ fontSize: 13, color: colors.n5, fontWeight: '500' }}
              >
                {prettyAccountType(
                  fromPlaidAccountType(account.type, account.subtype)
                )}
              </Text>
              <Text style={{ fontSize: 13, color: colors.n5, marginLeft: 3 }}>
                ...{account.mask}
              </Text>
            </View>
          </View>
          {rightContent}
        </View>
      </RectButton>
    </View>
  );
}
