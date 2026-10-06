import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { Link } from '#components/common/Link';
import { useServerURL } from '#components/ServerContext';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SettingsRow } from './SettingsRow';

export function EncryptionSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const serverURL = useServerURL();
  const [encryptKeyId] = useMetadataPref('encryptKeyId');
  const [groupId] = useMetadataPref('groupId');

  const missingCryptoAPI = !(window.crypto && crypto.subtle);

  if (!serverURL || !groupId) {
    return null;
  }

  function onCreateKey() {
    dispatch(
      pushModal({
        modal: {
          name: 'create-encryption-key',
          options: encryptKeyId ? { recreate: true } : {},
        },
      }),
    );
  }

  const noteStyle = {
    ...styles.smallText,
    lineHeight: 1.5,
    color: theme.settingsCardTextSubdued,
  };

  return (
    <SettingsRow
      title={t('End-to-end encryption')}
      description={
        <>
          <Trans>
            Enable this to encrypt your budget data with a key that only you
            have before it is sent to the server. Local data stays unencrypted,
            so you can re-encrypt it if you forget your password. Bank sync
            operations and secrets stored on the server are not covered.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/getting-started/sync/#end-to-end-encryption"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </>
      }
      control={
        encryptKeyId ? (
          <Button onPress={onCreateKey}>
            <Trans>Generate new key</Trans>
          </Button>
        ) : (
          <Button isDisabled={missingCryptoAPI} onPress={onCreateKey}>
            <Trans>Enable encryption</Trans>
          </Button>
        )
      }
    >
      {!encryptKeyId && missingCryptoAPI && (
        <Text style={noteStyle}>
          <Trans>
            End-to-end encryption needs an HTTPS connection to your server. It
            is also unavailable if your browser is too old to work with Actual.
          </Trans>{' '}
          <Link
            variant="external"
            to="https://actualbudget.org/docs/config/https"
            linkColor="purple"
          >
            <Trans>Learn more</Trans>
          </Link>
        </Text>
      )}
    </SettingsRow>
  );
}
