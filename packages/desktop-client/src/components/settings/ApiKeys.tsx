import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { sendCatch } from '@actual-app/core/platform/client/connection';
import type { ApiKey } from '@actual-app/core/server/auth/api-keys';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SettingsRow } from './SettingsRow';

export function ApiKeys({ fileId }: { fileId: string }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [reload, setReload] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void sendCatch('api-keys-list').then(result => {
      if (!active) return;
      if (result.error) setFailed(true);
      else setKeys(result.data.filter(key => key.fileIds.includes(fileId)));
    });
    return () => {
      active = false;
    };
  }, [fileId, reload]);

  function openModal(apiKey?: ApiKey) {
    dispatch(
      pushModal({
        modal: {
          name: 'api-key',
          options: {
            fileId,
            apiKey,
            onChange: () => setReload(value => value + 1),
          },
        },
      }),
    );
  }

  const addButton = (
    <Button isDisabled={!keys || failed} onPress={() => openModal()}>
      <Trans>Add key</Trans>
    </Button>
  );

  return (
    <SettingsRow
      title={t('API keys')}
      description={t(
        'Give an integration read and write access to this budget without sharing your login. Bank sync and server administration are not available through API keys.',
      )}
      control={addButton}
    >
      {failed ? (
        <View style={{ gap: spacing.sm }}>
          <Text role="alert" style={{ color: theme.errorText }}>
            <Trans>
              Could not load API keys. Check your connection and that your
              server supports API keys, then try again.
            </Trans>
          </Text>
          <Button onPress={() => setReload(value => value + 1)}>
            <Trans>Retry</Trans>
          </Button>
        </View>
      ) : (
        keys && (
          <View style={{ gap: spacing.xs }}>
            {keys.length === 0 && (
              <Text>
                <Trans>You have no API keys for this budget.</Trans>
              </Text>
            )}
            {keys.map(key => (
              <View
                key={key.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: `1px solid ${theme.tableBorder}`,
                  backgroundColor: theme.tableBackground,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                    color: theme.tableText,
                  }}
                >
                  {key.name}
                </Text>
                <Button
                  aria-label={t('Revoke {{name}}', { name: key.name })}
                  onPress={() => openModal(key)}
                >
                  <Trans>Revoke</Trans>
                </Button>
              </View>
            ))}
          </View>
        )
      )}
    </SettingsRow>
  );
}
