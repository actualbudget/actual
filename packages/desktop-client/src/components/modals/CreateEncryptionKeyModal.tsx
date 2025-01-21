// @ts-strict-ignore
import React, { useState } from 'react';
import { Form } from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import { css } from '@emotion/css';

import { sync } from 'loot-core/client/app/appSlice';
import { loadAllFiles } from 'loot-core/client/budgets/budgetsSlice';
import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { loadGlobalPrefs } from 'loot-core/client/prefs/prefsSlice';
import { send } from 'loot-core/src/platform/client/fetch';
import { getCreateKeyError } from 'loot-core/src/shared/errors';

import { useDispatch } from '../../redux';
import { styles, theme } from '../../style';
import { ButtonWithLoading } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Link } from '../common/Link';
import {
  Modal,
  ModalButtons,
  ModalCloseButton,
  ModalHeader,
} from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useResponsive } from '../responsive/ResponsiveProvider';

type CreateEncryptionKeyModalProps = Extract<
  ModalType,
  { name: 'create-encryption-key' }
>['options'];

export function CreateEncryptionKeyModal({
  recreate,
}: CreateEncryptionKeyModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { isNarrowWidth } = useResponsive();
  const dispatch = useDispatch();

  const isRecreating = recreate;

  async function onCreateKey(close: () => void) {
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
      close();
    }
  }

  return (
    <Modal name="create-encryption-key">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={
              isRecreating ? t('Generate new key') : t('Enable encryption')
            }
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
                  <Trans>
                    To enable end-to-end encryption, you need to create a key.
                    We will generate a key based on a password and use it to
                    encrypt from now on.{' '}
                    <strong>This requires a sync reset</strong> and all other
                    devices will have to revert to this version of your data.{' '}
                  </Trans>
                  <Link
                    variant="external"
                    to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                    linkColor="purple"
                  >
                    {t('Learn more')}
                  </Link>
                </Paragraph>
                <Paragraph>
                  <ul
                    className={css({
                      marginTop: 0,
                      '& li': { marginBottom: 8 },
                    })}
                  >
                    <li>
                      <Trans>
                        <strong>Important:</strong> if you forget this password{' '}
                        <em>and</em> you don’t have any local copies of your
                        data, you will lose access to all your data. The data
                        cannot be decrypted without the password.
                      </Trans>
                    </li>
                    <li>
                      <Trans>
                        This key only applies to this file. You will need to
                        generate a new key for each file you want to encrypt.
                      </Trans>
                    </li>
                    <li>
                      <Trans>
                        If you’ve already downloaded your data on other devices,
                        you will need to reset them. Actual will automatically
                        take you through this process.
                      </Trans>
                    </li>
                    <li>
                      <Trans>
                        It is recommended for the encryption password to be
                        different than the log-in password in order to better
                        protect your data.
                      </Trans>
                    </li>
                  </ul>
                </Paragraph>
              </>
            ) : (
              <>
                <Paragraph style={{ marginTop: 5 }}>
                  <Trans>
                    This will generate a new key for encrypting your data.{' '}
                    <strong>This requires a sync reset</strong> and all other
                    devices will have to revert to this version of your data.
                    Actual will take you through that process on those devices.
                  </Trans>{' '}
                  <Link
                    variant="external"
                    to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
                    linkColor="purple"
                  >
                    <Trans>Learn more</Trans>
                  </Link>
                </Paragraph>
                <Paragraph>
                  <Trans>
                    Key generation is randomized. The same password will create
                    different keys, so this will change your key regardless of
                    the password being different.
                  </Trans>
                </Paragraph>
              </>
            )}
          </View>
          <Form
            onSubmit={e => {
              e.preventDefault();
              onCreateKey(close);
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: 600, marginBottom: 3 }}>
                <Trans>Password</Trans>
              </Text>

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
                  <Trans>Show password</Trans>
                </label>
              </Text>
            </View>

            <ModalButtons style={{ marginTop: 20 }}>
              <ButtonWithLoading
                type="submit"
                style={{
                  height: isNarrowWidth ? styles.mobileMinHeight : undefined,
                }}
                isLoading={loading}
                variant="primary"
              >
                <Trans>Enable</Trans>
              </ButtonWithLoading>
            </ModalButtons>
          </Form>
        </>
      )}
    </Modal>
  );
}
