import React from 'react';

import { Text, Button } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { useServerURL } from '../../hooks/useServerURL';

import { Setting } from './UI';

export default function EncryptionSettings({ prefs, pushModal }) {
  const serverURL = useServerURL();

  function onChangeKey() {
    pushModal('create-encryption-key', { recreate: true });
  }

  return prefs.encryptKeyId ? (
    <Setting
      primaryAction={<Button onClick={onChangeKey}>Generate new key</Button>}
    >
      <Text>
        <Text style={{ color: colors.g4, fontWeight: 600 }}>
          End-to-end Encryption is turned on.
        </Text>{' '}
        Your data is encrypted with a key that only you have before sending it
        it out to the cloud. Local data remains unencrypted so if you forget
        your password you can re-encrypt it.{' '}
        <a
          href="https://actualbudget.github.io/docs/Getting-Started/sync/#encryption"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more…
        </a>
      </Text>
    </Setting>
  ) : serverURL ? (
    <Setting
      button={
        <Button onClick={() => pushModal('create-encryption-key')}>
          Enable encryption…
        </Button>
      }
    >
      <Text>
        <strong>End-to-end encryption</strong> is not enabled. Any data on the
        server is still protected by the server password, but it's not
        end-to-end encrypted which means the server owners have the ability to
        read it. If you want, you can use an additional password to encrypt your
        data on the server.{' '}
        <a
          href="https://actualbudget.github.io/docs/Getting-Started/sync/#encryption"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more…
        </a>
      </Text>
    </Setting>
  ) : (
    <Setting button={<Button disabled>Enable encryption…</Button>}>
      <Text>
        <strong>End-to-end encryption</strong> is not available when running
        without a server. Budget files are always kept unencrypted locally, and
        encryption is only applied when sending data to a server.{' '}
        <a
          href="https://actualbudget.github.io/docs/Getting-Started/sync/#encryption"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn more…
        </a>
      </Text>
    </Setting>
  );
}
