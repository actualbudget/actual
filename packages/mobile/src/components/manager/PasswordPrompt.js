import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { connect } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as actions from 'loot-core/src/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import KeyboardAvoidingView from 'loot-design/src/components/mobile/KeyboardAvoidingView';
import Stack from 'loot-design/src/components/Stack';
import Header from './Header';
import SingleInput from './SingleInput';
import TransitionView from './TransitionView';
import { bindActionCreators } from 'redux';

function getErrorMessage(error) {
  switch (error) {
    case 'invalid-password':
      return 'Invalid password';
    case 'network-failure':
      return 'Unable to contact the server';
    default:
      return "Whoops, an error occurred on our side! We'll try to get it fixed soon.";
  }
}

function PasswordPrompt({ navigation, actions }) {
  let [password, setPassword] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    let { error } = await send('subscribe-sign-in', { password });
    setLoading(false);

    if (error) {
      setError(getErrorMessage(error));
    } else {
      let userData = await actions.getUserData();
      if (userData) {
        await actions.loadAllFiles();
      }

      actions.setAppState({
        managerHasInitialized: true,
        loadingText: null
      });
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView>
        <TransitionView navigation={navigation}>
          {/* <StatusBar barStyle="light-content" /> */}

          <Header
            navigation={navigation}
            buttons={[]}
          />

          <Stack justify="center" style={{ flex: 1, padding: 20 }} spacing={5}>
            <View>
              <View
                style={{
                  alignItems: 'center'
                }}
              >
                <View style={{ width: 335 }}>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 25,
                      fontWeight: '700',
                      alignSelf: 'center'
                    }}
                  >
                    Sign in to this Actual instance
                  </Text>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 17,
                      marginTop: 20,
                      lineHeight: 25
                    }}
                  >
                    If you lost your password, you likely still have access to your server to manually reset it.
                  </Text>
                </View>
              </View>
            </View>

            <SingleInput
              value={password}
              loading={loading}
              error={error}
              inputProps={{
                secureTextEntry: true,
              }}
              onChange={setPassword}
              onSubmit={onSubmit}
            />
          </Stack>
        </TransitionView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default connect(
  null,
  dispatch => ({
    actions: bindActionCreators(actions, dispatch)
  })
)(PasswordPrompt);
