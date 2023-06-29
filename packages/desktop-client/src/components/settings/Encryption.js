import React from 'react';

import { colors } from '../../style';
import { Text, Button, ExternalLink } from '../common';
import { useServerURL } from '../ServerContext';

import { Setting } from './UI';

export default function EncryptionSettings({ prefs, pushModal }) {
  const serverURL = useServerURL();
  const missingCryptoAPI = !(window.crypto && crypto.subtle);

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
        <ExternalLink to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption">
          Learn more…
        </ExternalLink>
      </Text>
    </Setting>
  ) : missingCryptoAPI ? (
    <Setting primaryAction={<Button disabled>Enable encryption…</Button>}>
      <Text>
        <strong>End-to-end encryption</strong> is not available when making an
        unencrypted connection to a remote server. You’ll need to enable HTTPS
        on your server to use end-to-end encryption. This problem may also occur
        if your browser is too old to work with Actual.{' '}
        <ExternalLink to="https://actualbudget.org/docs/config/https">
          Learn more…
        </ExternalLink>
      </Text>
    </Setting>
  ) : serverURL ? (
    <Setting
      primaryAction={
        <Button onClick={() => pushModal('create-encryption-key')}>
          Enable encryption…
        </Button>
      }
    >
      <Text>
        <strong>End-to-end encryption</strong> is not enabled. Any data on the
        server is still protected by the server password, but it’s not
        end-to-end encrypted which means the server owners have the ability to
        read it. If you want, you can use an additional password to encrypt your
        data on the server.{' '}
        <ExternalLink to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption">
          Learn more…
        </ExternalLink>
      </Text>
    </Setting>
  ) : (
    <Setting primaryAction={<Button disabled>Enable encryption…</Button>}>
      <Text>
        <strong>End-to-end encryption</strong> is not available when running
        without a server. Budget files are always kept unencrypted locally, and
        encryption is only applied when sending data to a server.{' '}
        <ExternalLink to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption">
          Learn more…
        </ExternalLink>
      </Text>
    </Setting>
  );
}
