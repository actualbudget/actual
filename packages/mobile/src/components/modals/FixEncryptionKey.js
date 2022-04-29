import React, { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import {
  FieldLabel,
  InputField
} from 'loot-design/src/components/mobile/forms';
import { send } from 'loot-core/src/platform/client/fetch';
import * as actions from 'loot-core/src/client/actions';
import { styles, colors } from 'loot-design/src/style';
import Modal from '../modals/Modal';
import { getDownloadError, getTestKeyError } from 'loot-core/src/shared/errors';

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

function FixEncryptionKey({ route, navigation, actions }) {
  let [password, setPassword] = useState('');
  let [error, setError] = useState(null);
  let [loading, setLoading] = useState(false);

  let { hasExistingKey, cloudFileId, onSuccess } = route.params || {};

  async function onUpdateKey(e) {
    if (password !== '' && !loading) {
      setError(null);
      setLoading(true);

      let { error } = await send('key-test', {
        password,
        fileId: cloudFileId
      });
      setLoading(false);

      if (error) {
        setError(getTestKeyError(error));
        return;
      }

      navigation.goBack(null);

      if (onSuccess) {
        onSuccess();
      }
    }
  }

  return (
    <Modal
      title={
        hasExistingKey ? 'Unable to decrypt file' : 'This file is encrypted'
      }
      forceInset={{ bottom: 'never' }}
    >
      <Text style={{ padding: 15, paddingBottom: 0, lineHeight: 20 }}>
        {hasExistingKey ? (
          <Text style={{ fontSize: 15 }}>
            This file was encrypted with a different key than you are currently
            using. This probably means you changed your password. Enter your
            current password to update your key.
          </Text>
        ) : (
          <Text style={{ fontSize: 15 }}>
            We don{"'"}t have a key that encrypts or decrypts this file. Enter
            the password for this file to create the key for encryption.
          </Text>
        )}
      </Text>

      {error && (
        <Text
          style={{
            color: colors.r4,
            padding: 15,
            paddingTop: 10,
            paddingBottom: 0
          }}
        >
          {error}
        </Text>
      )}

      <View
        style={{
          flexDirection: 'column'
        }}
      >
        <FieldLabel title="Password" />
        <InputField
          value={password}
          onChange={e => setPassword(e.nativeEvent.text)}
          onSubmitEditing={onUpdateKey}
          autoFocus
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          padding: 15,
          marginTop: 5
        }}
      >
        <Button style={{ marginRight: 10 }} onPress={() => navigation.goBack()}>
          Back
        </Button>
        <ButtonWithLoading loading={loading} primary onPress={onUpdateKey}>
          {hasExistingKey ? 'Update key' : 'Create key'}
        </ButtonWithLoading>
      </View>
    </Modal>
  );
}

export default connect(
  null,
  dispatch => ({ actions: bindActionCreators(actions, dispatch) })
)(FixEncryptionKey);
