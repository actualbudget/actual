import React from 'react';

import { Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { ButtonSetting } from './UI';

export default function EncryptionSettings({ prefs, pushModal }) {
  function onChangeKey() {
    pushModal('create-encryption-key', { recreate: true });
  }

  return prefs.encryptKeyId ? (
    <ButtonSetting
      button={<Button onClick={onChangeKey}>Generate new key</Button>}
    >
      <Text>
        <Text style={{ color: colors.g4, fontWeight: 600 }}>
          End-to-end Encryption is turned on.
        </Text>{' '}
        Your data is encrypted with a key that only you have before sending it
        out to the cloud . Local data remains unencrypted so if you forget your
        password you can re-encrypt it.
      </Text>
    </ButtonSetting>
  ) : (
    <ButtonSetting
      button={
        <Button
          onClick={() => {
            alert(
              'End-to-end encryption is not supported on the self-hosted service yet'
            );
            // pushModal('create-encryption-key');
          }}
        >
          Enable encryption…
        </Button>
      }
    >
      <Text>
        <strong>End-to-end encryption</strong> is not enabled. Any data on our
        servers is still stored safely and securely, but it's not end-to-end
        encrypted which means we have the ability to read it (but we won't). If
        you want, you can use a password to encrypt your data on our servers.
      </Text>
    </ButtonSetting>
  );
}
