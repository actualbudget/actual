import React, { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import Stack from 'loot-design/src/components/Stack';
import { send } from 'loot-core/src/platform/client/fetch';
import { colors, styles } from 'loot-design/src/style';
import SingleInput from './SingleInput';
import Header from './Header';
import TransitionView from './TransitionView';
import { setupPurchases, getOfferings } from '../../util/iap';

function getErrorMessage(error) {
  switch (error) {
    case 'not-confirmed':
      return 'Invalid code';
    case 'expired':
      return 'Code is expired. Go back to resend a new code.';
    case 'too-many-attempts':
      return 'Too many attempts to login. Go back to resend a new code.';
    default:
      return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
  }
}

function Confirm({ route, navigation, getUserData, loginUser, createBudget }) {
  let [code, setCode] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  let { signingUp } = route.params || {};

  async function onConfirm() {
    let { email } = route.params || {};
    setLoading(true);

    let {
      confirmed,
      error,
      userId,
      key,
      validSubscription
    } = await send('subscribe-confirm', { email, code });

    if (error) {
      setLoading(false);
      setError(getErrorMessage(error));
    } else if (!confirmed) {
      setLoading(false);
      setError(getErrorMessage('not-confirmed'));
    } else if (!validSubscription) {
      if (Platform.OS === 'ios') {
        // Eagerly load in the offerings (otherwise the subscribe button
        // shows a loading state which is weird)
        await setupPurchases({ id: userId, email: email });
        await getOfferings();

        setLoading(false);
        navigation.navigate('Subscribe', { email, userId, key });
      } else {
        // This is a "half-created" account, right now on Android we
        // don't fix it here, we just tell the user. This is super
        // rare - only happens if a user on iOS creates an account but
        // doesn't subscribe, and then tries to log in on Android with
        // that account
        alert(
          'An error occurred loading your account. Please contact help@actualbudget.com for support'
        );
        setLoading(false);
      }
    } else {
      setLoading(false);

      // This will load the user in the backend and rerender the app
      // in the logged in state
      loginUser(userId, key);

      if (global.SentryClient) {
        global.SentryClient.setUser({
          id: userId,
          ip_address: '{{auto}}'
        });
      }
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
          <Header
            navigation={navigation}
            buttons={['back', 'demo']}
            loadDemoBudget={() => createBudget({ demoMode: true })}
          />

          <Stack justify="center" style={{ flex: 1, padding: 20 }} spacing={5}>
            <View>
              {signingUp ? (
                <Text style={textStyle}>
                  Enter the code you got in your email to activate your account:
                </Text>
              ) : (
                <Text style={textStyle}>
                  Enter the code you got in your email:
                </Text>
              )}
            </View>

            <SingleInput
              title="Code"
              value={code}
              loading={loading}
              error={error}
              inputProps={{ keyboardType: 'numeric' }}
              onChange={setCode}
              onSubmit={onConfirm}
            />
          </Stack>
        </TransitionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default connect(null, actions)(Confirm);
