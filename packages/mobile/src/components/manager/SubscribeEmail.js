import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import { colors, styles } from 'loot-design/src/style';
import { send } from 'loot-core/src/platform/client/fetch';
import { getSubscribeError } from 'loot-core/src/shared/errors';
import Stack from 'loot-design/src/components/Stack';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import Header from './Header';
import SingleInput from './SingleInput';
import * as iap from '../../util/iap.js';
import TransitionView from './TransitionView';

export function SubscribeEmail({ navigation, createBudget }) {
  let [email, setEmail] = useState('');
  let [error, setError] = useState(null);
  let [loading, setLoading] = useState(false);

  async function eagerlyLoadOfferings(userId, email) {
    await iap.setupPurchases({ id: userId, email });
    iap.getOfferings();
  }

  async function onSignup() {
    setLoading(true);
    setError(null);
    let { error, userId, key } = await send('subscribe-subscribe', {
      email,
      useStripe: Platform.OS !== 'ios'
    });

    if (error) {
      setLoading(false);
      setError(getSubscribeError(error));
    } else {
      if (Platform.OS === 'ios') {
        // Don't block on this, but start loading the available offerings
        // now so when they see the subscribe screen later they don't see
        // a loading screen
        eagerlyLoadOfferings(userId, email);
      }

      let { error } = await send('subscribe-send-email-code', { email });

      if (error) {
        setError('Something went wrong while activating your account');
        return;
      }

      setLoading(false);
      navigation.navigate('Confirm', { email, signingUp: true });
    }
  }

  let textStyle = [
    styles.text,
    { fontSize: 17, lineHeight: 25, color: 'white' }
  ];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView>
        <TransitionView navigation={navigation}>
          {/* <StatusBar barStyle="light-content" /> */}

          <Header
            navigation={navigation}
            loadDemoBudget={() => createBudget({ demoMode: true })}
          />
          <Stack justify="center" style={{ flex: 1, padding: 20 }} spacing={5}>
            <View>
              <Text style={[textStyle, { maxWidth: 500 }]}>
                <Text style={{ fontWeight: '700' }}>Create an account.</Text>{' '}
                Sign up to sync your data across all devices. By default all
                your data is local. In the future we will also provide bank
                syncing.
              </Text>
            </View>

            <SingleInput
              title="Email"
              value={email}
              loading={loading}
              error={error}
              inputProps={{
                keyboardType: 'email-address',
                placeholder: 'hello@example.com'
              }}
              onChange={setEmail}
              onSubmit={onSignup}
            />
          </Stack>
        </TransitionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default connect(null, actions)(SubscribeEmail);
