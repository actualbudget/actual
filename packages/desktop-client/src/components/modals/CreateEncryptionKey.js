import React, { useState } from 'react';

import { css } from 'glamor';

import { send } from 'loot-core/src/platform/client/fetch';
import { getCreateKeyError } from 'loot-core/src/shared/errors';
import {
  View,
  Text,
  Modal,
  ButtonWithLoading,
  ExternalLink,
  P,
  ModalButtons,
  Input,
  InitialFocus
} from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

export default function CreateEncryptionKey({
  modalProps,
  actions,
  options = {}
}) {
  let [password, setPassword] = useState('');
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState('');
  let [showPassword, setShowPassword] = useState(false);

  let isRecreating = options.recreate;

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
      actions.popModal();
    }
  }

  return (
    <Modal
      {...modalProps}
      style={{ width: 600 }}
      title={isRecreating ? 'Generate new key' : 'Enable encryption'}
      onClose={() => actions.popModal()}
    >
      {() => (
        <>
          {!isRecreating ? (
            <>
              <P style={{ marginTop: 5 }}>
                To enable end-to-end encryption, you need to create a key. We
                will generate a key based on a password and use it to encrypt
                from now on. <strong>This requires a sync reset</strong> and all
                other devices will have to revert to this version of your data.{' '}
                <ExternalLink
                  asAnchor
                  href="https://actualbudget.github.io/docs/Getting-Started/sync#end-to-end-encryption"
                >
                  Learn more
                </ExternalLink>
              </P>
              <P>
                <ul {...css({ marginTop: 0, '& li': { marginBottom: 8 } })}>
                  <li>
                    <strong>Important:</strong> if you forget this password{' '}
                    <em>and</em> you don't have any local copies of your data,
                    you will lose access to all your data. The data cannot be
                    decrypted without the password.
                  </li>
                  <li>
                    This key only applies to this file. You will need to
                    generate a new key for each file you want to encrypt.
                  </li>
                  <li>
                    If you've already downloaded your data on other devices, you
                    will need to reset them. Actual will automatically take you
                    through this process.
                  </li>
                  <li>
                    It is recommended for the encryption password to be
                    different than the log-in password in order to better
                    protect your data.
                  </li>
                </ul>
              </P>
            </>
          ) : (
            <>
              <P style={{ marginTop: 5 }}>
                This will generate a new key for encrypting your data.{' '}
                <strong>This requires a sync reset</strong> and all other
                devices will have to revert to this version of your data. Actual
                will take you through that process on those devices.{' '}
                <ExternalLink
                  asAnchor
                  href="https://actualbudget.github.io/docs/Getting-Started/sync#end-to-end-encryption"
                >
                  Learn more
                </ExternalLink>
              </P>
              <P>
                Key generation is randomized. The same password will create
                different keys, so this will change your key regardless of the
                password being different.
              </P>
            </>
          )}
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
                    color: colors.r4,
                    textAlign: 'center',
                    fontSize: 13,
                    marginBottom: 3
                  }}
                >
                  {error}
                </View>
              )}

              <InitialFocus>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  style={{ width: 300 }}
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
              <ButtonWithLoading loading={loading} primary>
                Enable
              </ButtonWithLoading>
            </ModalButtons>
          </form>
        </>
      )}
    </Modal>
  );
}
