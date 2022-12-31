import React, { useState } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import Stack from 'loot-design/src/components/Stack';
import Header from './Header';
import SingleInput from './SingleInput';
import { colors, mobileStyles as styles } from 'loot-design/src/style';
import TransitionView from './TransitionView';

function getErrorMessage(error) {
  switch (error) {
    case 'not-found':
      return 'An account with that email does not exist.';
    case 'network-failure':
      return 'Unable to contact the server.';
    default:
      return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
  }
}

function Login({ navigation, createBudget }) {
  let [email, setEmail] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  async function sendCode() {
    setLoading(true);
    setError(null);
    let { error } = await send('subscribe-send-email-code', { email });
    setLoading(false);

    if (error) {
      setError(getErrorMessage(error));
    } else {
      navigation.navigate('Confirm', { email });
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
            buttons={['back', 'demo']}
            loadDemoBudget={() => {
              createBudget({ demoMode: true });
            }}
          />

          <Stack justify="center" style={{ flex: 1, padding: 20 }} spacing={5}>
            <View>
              <Text style={textStyle}>
                <Text style={{ fontWeight: '700' }}>Sign in.</Text> We
                {"'"}
                ll email you a code that you can use to log in. You only need to
                do this once. Right now, the mobile app works best as a
                companion to the desktop app.
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
              onSubmit={sendCode}
            />
          </Stack>
        </TransitionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default connect(null, actions)(Login);
