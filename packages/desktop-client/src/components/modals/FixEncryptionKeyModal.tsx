// @ts-strict-ignore
import React, { useState } from 'react';

import { type FinanceModals } from 'loot-core/src/client/state-types/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import { getTestKeyError } from 'loot-core/src/shared/errors';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { Button, ButtonWithLoading } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import { Modal, ModalButtons } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type FixEncryptionKeyModalProps = {
  modalProps: CommonModalProps;
  options: FinanceModals['fix-encryption-key'];
};

export function FixEncryptionKeyModal({
  modalProps,
  options = {},
}: FixEncryptionKeyModalProps) {
  const { hasExistingKey, cloudFileId, onSuccess } = options;

  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isNarrowWidth } = useResponsive();

  async function onUpdateKey() {
    if (password !== '' && !loading) {
      setLoading(true);
      setError(null);

      const { error } = await send('key-test', {
        password,
        fileId: cloudFileId,
      });
      if (error) {
        setError(getTestKeyError(error));
        setLoading(false);
        return;
      }

      modalProps.onClose();
      onSuccess?.();
    }
  }

  return (
    <Modal
      {...modalProps}
      title={
        hasExistingKey ? 'Unable to decrypt file' : 'This file is encrypted'
      }
      onClose={modalProps.onClose}
    >
      <View
        style={{
          maxWidth: 500,
          overflowX: 'hidden',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {hasExistingKey ? (
          <Paragraph>
            This file was encrypted with a different key than you are currently
            using. This probably means you changed your password. Enter your
            current password to update your key.{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
            >
              Learn more
            </Link>
          </Paragraph>
        ) : (
          <Paragraph>
            We don’t have a key that encrypts or decrypts this file. Enter the
            password for this file to create the key for encryption.{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
            >
              Learn more
            </Link>
          </Paragraph>
        )}
      </View>
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
              style={{
                width: isNarrowWidth ? '100%' : '50%',
                height: isNarrowWidth ? styles.mobileMinHeight : undefined,
              }}
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
            style={{
              height: isNarrowWidth ? styles.mobileMinHeight : undefined,
              marginRight: 10,
            }}
            onClick={() => modalProps.onBack()}
            type="normal"
          >
            Back
          </Button>
          <ButtonWithLoading
            type="primary"
            style={{
              height: isNarrowWidth ? styles.mobileMinHeight : undefined,
            }}
            loading={loading}
            onClick={onUpdateKey}
          >
            {hasExistingKey ? 'Update key' : 'Create key'}
          </ButtonWithLoading>
        </ModalButtons>
      </form>
    </Modal>
  );
}
