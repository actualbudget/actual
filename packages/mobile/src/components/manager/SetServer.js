import React, { useState } from 'react';
import { View, Text, StatusBar, Dimensions } from 'react-native';
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
    case 'network-failure':
      return 'Server is not running at this URL';
    default:
      return 'Server does not look like an Actual server. Is it set up correctly?';
  }
}

function SetServer({ navigation }) {
  let [url, setUrl] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    let { error } = await send('set-server-url', { url });
    setLoading(false);

    if (error) {
      setError(getErrorMessage(error));
    } else {
      navigation.navigate('PasswordPrompt');
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
                    Where's the server?
                  </Text>
                  <Text
                    style={{
                      color: 'white',
                      fontSize: 17,
                      marginTop: 20,
                      lineHeight: 25
                    }}
                  >
                    There is no server configured. After running the server, specify the URL here to use the app. You can always change this later. We will validate that Actual is running at this URL.
                  </Text>
                </View>
              </View>
            </View>

            <SingleInput
              value={url}
              loading={loading}
              error={error}
              inputProps={{
                keyboardType: 'url',
              }}
              onChange={setUrl}
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
  actions
)(SetServer);
