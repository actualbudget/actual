import React, { useState } from 'react';

import { send } from 'loot-core/src/platform/client/fetch';
import { getTestKeyError } from 'loot-core/src/shared/errors';

import { theme } from '../../style';
import Button, { ButtonWithLoading } from '../common/Button';
import ExternalLink from '../common/ExternalLink';
import InitialFocus from '../common/InitialFocus';
import Input from '../common/Input';
import Modal, { ModalButtons } from '../common/Modal';
import Paragraph from '../common/Paragraph';
import Text from '../common/Text';
import View from '../common/View';

export default function FixEncryptionKey({
  modalProps,
  actions,
  options = {},
}) {
  let { hasExistingKey, cloudFileId, onSuccess } = options;

  let [password, setPassword] = useState('');
  let [error, setError] = useState('');
  let [loading, setLoading] = useState(false);
  let [showPassword, setShowPassword] = useState(false);

  async function onUpdateKey() {
    if (password !== '' && !loading) {
      setLoading(true);
      setError(null);

      let { error } = await send('key-test', {
        password,
        fileId: cloudFileId,
      });
      if (error) {
        setError(getTestKeyError(error));
        setLoading(false);
        return;
      }

      actions.popModal();
      onSuccess?.();
    }
  }

  return (
    <Modal {...modalProps} showHeader={false} style={{ width: 600 }}>
      {() => (
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 25,
              fontWeight: 700,
              color: theme.pageTextDark,
              margin: '20px 0',
            }}
          >
            {hasExistingKey
              ? 'Unable to decrypt file'
              : 'This file is encrypted'}
          </Text>
          {hasExistingKey ? (
            <Paragraph>
              This file was encrypted with a different key than you are
              currently using. This probably means you changed your password.
              Enter your current password to update your key.{' '}
              <ExternalLink to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption">
                Learn more
              </ExternalLink>
            </Paragraph>
          ) : (
            <Paragraph>
              We don’t have a key that encrypts or decrypts this file. Enter the
              password for this file to create the key for encryption.{' '}
              <ExternalLink to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption">
                Learn more
              </ExternalLink>
            </Paragraph>
          )}
          <form
            onSubmit={e => {
              e.preventDefault();
              onUpdateKey();
            }}
          >
            <View
              style={{
                marginTop: 15,
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: 600, marginBottom: 5 }}>Password</Text>{' '}
              {error && (
                <View
                  style={{
                    color: theme.errorText,
                    textAlign: 'center',
                    fontSize: 13,
                    marginBottom: 3,
                  }}
                >
                  {error}
                </View>
              )}
              <InitialFocus>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  style={{ width: '50%' }}
                  onChange={e => setPassword(e.target.value)}
                />
              </InitialFocus>
              <Text style={{ marginTop: 5 }}>
                <label style={{ userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    onClick={() => setShowPassword(!showPassword)}
                  />{' '}
                  Show password
                </label>
              </Text>
            </View>

            <ModalButtons style={{ marginTop: 20 }}>
              <Button
                style={{ marginRight: 10 }}
                onClick={() => modalProps.onBack()}
                type="normal"
              >
                Back
              </Button>
              <ButtonWithLoading
                type="primary"
                loading={loading}
                onClick={onUpdateKey}
              >
                {hasExistingKey ? 'Update key' : 'Create key'}
              </ButtonWithLoading>
            </ModalButtons>
          </form>
        </View>
      )}
    </Modal>
  );
}
