import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Alert, StatusBar, Linking } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import { colors, styles } from 'loot-design/src/style';
import { send } from 'loot-core/src/platform/client/fetch';
import { getSubscribeError } from 'loot-core/src/shared/errors';
import Stack from 'loot-design/src/components/Stack';
import {
  ButtonWithLoading,
  Button
} from 'loot-design/src/components/mobile/common';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import { InputField } from 'loot-design/src/components/mobile/forms';
import AccountButton from '../AccountButton';
import Header from './Header';

let buttonTextStyle = [
  styles.text,
  { fontWeight: 'bold', fontSize: 15, color: 'white' }
];

function ExternalLink({ href, children }) {
  return (
    <Text
      style={{ textDecorationLine: 'underline' }}
      onPress={() => Linking.openURL(href)}
    >
      {children}
    </Text>
  );
}

export function Subscribe({ route, navigation, getUserData, createBudget }) {
  let { email, userId, key } = route.params || {};

  let textStyle = [
    styles.text,
    { fontSize: 17, lineHeight: 25, color: 'white' }
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView>
        {/* <StatusBar barStyle="light-content" /> */}
        <Header navigation={navigation} buttons={['back']} />
        <Stack justify="center" style={{ flex: 1, padding: 20 }} spacing={8}>
          <View>
            <Text style={textStyle}>
              You{"'"}re almost there. You need to subscribe to gain access to
              Actual. No charges will be made for 1 month.
            </Text>
          </View>

          <View style={{ alignItems: 'center' }}>
            <Text style={[textStyle, { fontWeight: '700', marginBottom: 5 }]}>
              Start with a 1 month free trial.
            </Text>
            <AccountButton
              navigation={navigation}
              userData={{ id: userId, key, email }}
              darkMode={true}
              useDummyPurchaser={true}
            />
          </View>
        </Stack>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default connect(null, actions)(Subscribe);
