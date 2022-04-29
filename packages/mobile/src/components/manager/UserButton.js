import React from 'react';
import { View, Text } from 'react-native';
import { connectActionSheet } from '@expo/react-native-action-sheet';
import { connect } from 'react-redux';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'loot-design/src/components/mobile/common';
import { colors } from 'loot-design/src/style';
import Key from 'loot-design/src/svg/v2/Key';

function UserButton({
  navigation,
  userData,
  error,
  keyId,
  showActionSheetWithOptions,
  onLogOut
}) {
  function onPress() {
    if (userData || error) {
      let options = ['Log out', 'Cancel'];

      showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 1,
          title: error
            ? 'The current logged in user could not be authenticated. This usually means you are offline.'
            : userData.email
        },
        idx => {
          switch (idx) {
            case 0:
              onLogOut();
              break;
          }
        }
      );
    } else {
      navigation.dispatch(CommonActions.navigate({ routeName: 'Login' }));
    }
  }

  if (userData) {
    if (userData.offline) {
      return (
        <View
          style={{
            alignSelf: 'center',
            justifySelf: 'center',
            padding: 5,
            top: -5
          }}
        >
          <Text style={{ fontSize: 15, color: 'white' }}>Offline</Text>
        </View>
      );
    }

    return (
      <Button
        bare
        style={{
          backgroundColor: 'transparent',
          borderRadius: 4,
          fontSize: 15,
          padding: 5,
          paddingVertical: 10,
          top: -5
        }}
        textStyle={{ color: colors.n8, fontSize: 13 }}
        onPress={onPress}
      >
        {keyId && (
          <Key
            style={{ width: 12, height: 12, color: 'white', marginRight: 7 }}
          />
        )}
        <Text style={{ fontSize: 15, color: 'white' }}>{userData.email}</Text>
      </Button>
    );
  }
  return null;
}

export default connect(state => ({
  userData: state.user.data,
  error: state.user.error
}))(connectActionSheet(UserButton));
