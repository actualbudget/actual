// @ts-strict-ignore
import React from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Text } from '../common/Text';
import { useServerURL } from '../ServerContext';

import { Setting } from './UI';

export function EncryptionSettings() {
  const dispatch = useDispatch();
  const serverURL = useServerURL();
  const [encryptKeyId] = useMetadataPref('encryptKeyId');

  const missingCryptoAPI = !(window.crypto && crypto.subtle);

  function onChangeKey() {
    dispatch(pushModal('create-encryption-key', { recreate: true }));
  }

  return encryptKeyId ? (
    <Setting
      primaryAction={<Button onPress={onChangeKey}>Generate new key</Button>}
    >
      <Text>
        <Text style={{ color: theme.noticeTextLight, fontWeight: 600 }}>
          End-to-end Encryption is turned on.
        </Text>{' '}
        Your data is encrypted with a key that only you have before sending it
        it out to the cloud. Local data remains unencrypted so if you forget
        your password you can re-encrypt it.{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
    </Setting>
  ) : missingCryptoAPI ? (
    <Setting primaryAction={<Button isDisabled>Enable encryption…</Button>}>
      <Text>
        <strong>End-to-end encryption</strong> is not available when making an
        unencrypted connection to a remote server. You’ll need to enable HTTPS
        on your server to use end-to-end encryption. This problem may also occur
        if your browser is too old to work with Actual.{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/config/https"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
    </Setting>
  ) : serverURL ? (
    <Setting
      primaryAction={
        <Button onPress={() => dispatch(pushModal('create-encryption-key'))}>
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
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
    </Setting>
  ) : (
    <Setting primaryAction={<Button isDisabled>Enable encryption…</Button>}>
      <Text>
        <strong>End-to-end encryption</strong> is not available when running
        without a server. Budget files are always kept unencrypted locally, and
        encryption is only applied when sending data to a server.{' '}
        <Link
          variant="external"
          to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
          linkColor="purple"
        >
          Learn more…
        </Link>
      </Text>
    </Setting>
  );
}
