import React, { useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from 'loot-core/src/client/actions';
import {
  Button,
  ButtonWithLoading
} from 'loot-design/src/components/mobile/common';
import {
  FieldLabel,
  InputField
} from 'loot-design/src/components/mobile/forms';
import { send } from 'loot-core/src/platform/client/fetch';
import { mobileStyles as styles, colors } from 'loot-design/src/style';
import Modal from '../modals/Modal';
import { getCreateKeyError } from 'loot-core/src/shared/errors';

let textStyle = styles.text;

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

function CreateEncryptionKey({ route, navigation, actions }) {
  let [password, setPassword] = useState('');
  let [error, setError] = useState(null);
  let [loading, setLoading] = useState(false);

  let { recreate: isRecreating } = route.params || {};

  async function onCreateKey() {
    if (password !== '' && !loading) {
      setLoading(true);
      setError(null);

      let res = await send('key-make', { password });
      if (res.error) {
        setLoading(null);
        setError(getCreateKeyError(res.error));
        return;
      }

      actions.loadGlobalPrefs();
      actions.loadAllFiles();
      actions.sync();

      setLoading(false);
      navigation.goBack(null);
    }
  }

  return (
    <Modal
      title={isRecreating ? 'Generate new key' : 'Enable encryption'}
      showOverlay={false}
    >
      <View style={{ padding: 15, paddingBottom: 0 }}>
        {!isRecreating ? (
          <Text style={[textStyle, { marginBottom: 15 }]}>
            To enable encryption, you need to create a key. We will generate a
            key based on a password and use it to encrypt from now on. This is
            full end-to-end encryption and you{"'"}ll need to enter this
            password whenever you set up a new device.{' '}
            <ExternalLink
              asAnchor
              href="https://actualbudget.github.io/docs/Getting-Started/sync#end-to-end-encryption"
            >
              Learn more
            </ExternalLink>
          </Text>
        ) : (
          <>
            <Text style={textStyle}>
              This will generate a new key for encrypting your data. Changing
              your key will upload all your data encrypted with the new key and
              requires all other devices to be reset. Actual will take you
              through that process on those devices.{' '}
              <ExternalLink
                asAnchor
                href="https://actualbudget.github.io/docs/Getting-Started/sync#end-to-end-encryption"
              >
                Learn more
              </ExternalLink>
            </Text>
            <Text style={[textStyle, { marginTop: 15 }]}>
              Key generation is randomized. The same password will create
              different keys, so this will change your key regardless of the
              password being different.
            </Text>
          </>
        )}
      </View>

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

      <View style={{ flexDirection: 'column' }}>
        <FieldLabel title="Password" />
        <InputField
          value={password}
          onChange={e => setPassword(e.nativeEvent.text)}
          onSubmitEditing={onCreateKey}
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
        <ButtonWithLoading loading={loading} primary onPress={onCreateKey}>
          {isRecreating ? 'Reset key' : 'Enable'}
        </ButtonWithLoading>
      </View>
    </Modal>
  );
}

export default connect(
  null,
  dispatch => ({ actions: bindActionCreators(actions, dispatch) })
)(CreateEncryptionKey);
