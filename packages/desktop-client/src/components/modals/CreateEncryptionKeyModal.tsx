// @ts-strict-ignore
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { css } from 'glamor';

import { loadAllFiles, loadGlobalPrefs, sync } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';
import { getCreateKeyError } from 'loot-core/src/shared/errors';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { ButtonWithLoading } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import { Modal, ModalButtons } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type CreateEncryptionKeyModalProps = {
  modalProps: CommonModalProps;
  options: {
    recreate?: boolean;
  };
};

export function CreateEncryptionKeyModal({
  modalProps,
  options = {},
}: CreateEncryptionKeyModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const dispatch = useDispatch();

  const isRecreating = options.recreate;

  async function onCreateKey() {
    if (password !== '' && !loading) {
      setLoading(true);
      setError(null);

      const res = await send('key-make', { password });
      if (res.error) {
        setLoading(null);
        setError(getCreateKeyError(res.error));
        return;
      }

      dispatch(loadGlobalPrefs());
      dispatch(loadAllFiles());
      dispatch(sync());

      setLoading(false);
      modalProps.onClose();
    }
  }

  return (
    <Modal
      {...modalProps}
      title={isRecreating ? 'Generate new key' : 'Enable encryption'}
      onClose={modalProps.onClose}
    >
      <View
        style={{
          maxWidth: 600,
          overflowX: 'hidden',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {!isRecreating ? (
          <>
            <Paragraph style={{ marginTop: 5 }}>
              To enable end-to-end encryption, you need to create a key. We will
              generate a key based on a password and use it to encrypt from now
              on. <strong>This requires a sync reset</strong> and all other
              devices will have to revert to this version of your data.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                linkColor="purple"
              >
                Learn more
              </Link>
            </Paragraph>
            <Paragraph>
              <ul
                className={`${css({
                  marginTop: 0,
                  '& li': { marginBottom: 8 },
                })}`}
              >
                <li>
                  <strong>Important:</strong> if you forget this password{' '}
                  <em>and</em> you don’t have any local copies of your data, you
                  will lose access to all your data. The data cannot be
                  decrypted without the password.
                </li>
                <li>
                  This key only applies to this file. You will need to generate
                  a new key for each file you want to encrypt.
                </li>
                <li>
                  If you’ve already downloaded your data on other devices, you
                  will need to reset them. Actual will automatically take you
                  through this process.
                </li>
                <li>
                  It is recommended for the encryption password to be different
                  than the log-in password in order to better protect your data.
                </li>
              </ul>
            </Paragraph>
          </>
        ) : (
          <>
            <Paragraph style={{ marginTop: 5 }}>
              This will generate a new key for encrypting your data.{' '}
              <strong>This requires a sync reset</strong> and all other devices
              will have to revert to this version of your data. Actual will take
              you through that process on those devices.{' '}
              <Link
                variant="external"
                to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                linkColor="purple"
              >
                Learn more
              </Link>
            </Paragraph>
            <Paragraph>
              Key generation is randomized. The same password will create
              different keys, so this will change your key regardless of the
              password being different.
            </Paragraph>
          </>
        )}
      </View>
      <form
        onSubmit={e => {
          e.preventDefault();
          onCreateKey();
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontWeight: 600, marginBottom: 3 }}>Password</Text>

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
          <ButtonWithLoading
            style={{
              height: isNarrowWidth ? styles.mobileMinHeight : undefined,
            }}
            loading={loading}
            type="primary"
          >
            Enable
          </ButtonWithLoading>
        </ModalButtons>
      </form>
    </Modal>
  );
}
