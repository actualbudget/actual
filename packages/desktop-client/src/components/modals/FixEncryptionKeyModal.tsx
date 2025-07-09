// @ts-strict-ignore
import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button, ButtonWithLoading } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Paragraph } from '@actual-app/components/paragraph';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { getTestKeyError } from 'loot-core/shared/errors';

import { Link } from '@desktop-client/components/common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

type FixEncryptionKeyModalProps = Extract<
  ModalType,
  { name: 'fix-encryption-key' }
>['options'];

export function FixEncryptionKeyModal({
  cloudFileId,
  hasExistingKey,
  onSuccess,
}: FixEncryptionKeyModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { isNarrowWidth } = useResponsive();

  async function onUpdateKey(close: () => void) {
    if (password !== '' && !loading) {
      setLoading(true);
      setError(null);

      const { error } = await send('key-test', {
        password,
        cloudFileId,
      });
      if (error) {
        setError(getTestKeyError(error));
        setLoading(false);
        return;
      }

      onSuccess?.();
      close();
    }
  }

  return (
    <Modal name="fix-encryption-key">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              hasExistingKey
                ? t('Unable to decrypt file')
                : t('This file is encrypted')
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
                {t(
                  'This file was encrypted with a different key than you are currently using. This probably means you changed your password. Enter your current password to update your key.',
                )}{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                >
                  <Trans>Learn more</Trans>
                </Link>
              </Paragraph>
            ) : (
              <Paragraph>
                {t(
                  'We don’t have a key that encrypts or decrypts this file. Enter the password for this file to create the key for encryption.',
                )}{' '}
                <Link
                  variant="external"
                  to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                >
                  <Trans>Learn more</Trans>
                </Link>
              </Paragraph>
            )}
          </View>
          <Form
            onSubmit={e => {
              e.preventDefault();
              onUpdateKey(close);
            }}
          >
            <View
              style={{
                marginTop: 15,
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: 600, marginBottom: 5 }}>
                <Trans>Password</Trans>
              </Text>{' '}
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
                  onChangeValue={setPassword}
                />
              </InitialFocus>
              <Text style={{ marginTop: 5 }}>
                <label style={{ userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    onClick={() => setShowPassword(!showPassword)}
                  />{' '}
                  <Trans>Show password</Trans>
                </label>
              </Text>
            </View>

            <ModalButtons style={{ marginTop: 20 }}>
              <Button
                variant="normal"
                style={{
                  height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                  marginRight: 10,
                }}
                onPress={close}
              >
                <Trans>Back</Trans>
              </Button>
              <ButtonWithLoading
                type="submit"
                variant="primary"
                style={{
                  height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                }}
                isLoading={loading}
              >
                {hasExistingKey ? t('Update key') : t('Create key')}
              </ButtonWithLoading>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
}
