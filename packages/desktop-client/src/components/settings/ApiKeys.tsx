import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { sendCatch } from '@actual-app/core/platform/client/connection';
import type { ApiKey } from '@actual-app/core/server/auth/api-keys';

import { SettingsRow } from './SettingsRow';

export function ApiKeys({ fileId }: { fileId: string }) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const controlSize = isNarrowWidth ? 'extra-large' : 'medium';
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState('');
  const [created, setCreated] = useState<(ApiKey & { key: string }) | null>(
    null,
  );
  const [revoking, setRevoking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setBusy(true);
    setError('');
    try {
      const result = await sendCatch('api-keys-list');
      if (result.error) throw result.error;
      setKeys(result.data.filter(key => key.fileId === fileId));
    } catch {
      setError(
        t(
          'Could not load API keys. Check your connection and that your server supports API keys, then try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    setBusy(true);
    setError('');
    try {
      const result = await sendCatch('api-keys-create', {
        name: name.trim(),
        fileId,
      });
      if (result.error) throw result.error;
      const key = result.data;
      setCreated(key);
      // Keep the secret only in the temporary reveal, not in the key list.
      setKeys(keys => [
        {
          id: key.id,
          name: key.name,
          fileId: key.fileId,
          createdAt: key.createdAt,
        },
        ...(keys ?? []),
      ]);
      setName('');
    } catch {
      setError(
        t(
          'Could not create the API key. Check your connection and reload the list before trying again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError('');
    try {
      const result = await sendCatch('api-keys-revoke', { id });
      if (result.error) throw result.error;
      setKeys(keys => keys?.filter(key => key.id !== id) ?? []);
      if (created?.id === id) setCreated(null);
      setRevoking(null);
    } catch {
      setError(
        t('Could not revoke the API key. Check your connection and try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  const manageButton = (
    <Button size={controlSize} isDisabled={busy} onPress={() => void load()}>
      {busy ? t('Please wait…') : keys ? t('Reload keys') : t('Manage keys')}
    </Button>
  );

  return (
    <SettingsRow
      title={t('API keys')}
      description={t(
        'Give an integration read and write access to this budget without sharing your login. Bank sync and server administration are not available through API keys.',
      )}
      control={!isNarrowWidth && manageButton}
    >
      {isNarrowWidth && manageButton}
      {error && (
        <Text role="alert" style={{ color: theme.errorText }}>
          {error}
        </Text>
      )}
      {keys && (
        <View style={{ gap: spacing.md }}>
          {created ? (
            <View style={{ gap: spacing.sm }}>
              <label htmlFor="new-api-key">
                <Trans>
                  Copy this key now. You cannot view it again after closing this
                  message.
                </Trans>
              </label>
              <Input
                size={controlSize}
                id="new-api-key"
                autoFocus
                value={created.key}
                readOnly
                onFocus={event => event.target.select()}
                style={{ width: '100%' }}
              />
              <Button size={controlSize} onPress={() => setCreated(null)}>
                <Trans>Done</Trans>
              </Button>
            </View>
          ) : (
            <form
              onSubmit={event => {
                event.preventDefault();
                if (!busy && name.trim()) void create();
              }}
            >
              <View style={{ gap: spacing.sm }}>
                <label htmlFor="api-key-name">
                  <Trans>Key name</Trans>
                </label>
                <Input
                  size={controlSize}
                  id="api-key-name"
                  autoFocus
                  value={name}
                  maxLength={100}
                  required
                  onChange={event => setName(event.target.value)}
                  placeholder={t('e.g. Transaction importer')}
                />
                <Button
                  size={controlSize}
                  type="submit"
                  isDisabled={busy || !name.trim()}
                >
                  <Trans>Create key</Trans>
                </Button>
              </View>
            </form>
          )}
          {keys.length === 0 && (
            <Text>
              <Trans>You have no API keys for this budget.</Trans>
            </Text>
          )}
          {keys.map(key => (
            <View key={key.id} style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                }}
              >
                <Text
                  style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {key.name}
                </Text>
                <Button
                  size={controlSize}
                  isDisabled={busy}
                  aria-label={t('Revoke {{name}}', { name: key.name })}
                  onPress={() => setRevoking(key.id)}
                >
                  <Trans>Revoke</Trans>
                </Button>
              </View>
              {revoking === key.id && (
                <View style={{ gap: spacing.sm }}>
                  <Text>
                    <Trans>
                      Revoke this key? Integrations using it will lose server
                      access. Previously downloaded data will remain on their
                      devices.
                    </Trans>
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    <Button
                      size={controlSize}
                      isDisabled={busy}
                      onPress={() => void revoke(key.id)}
                    >
                      <Trans>Revoke key</Trans>
                    </Button>
                    <Button
                      size={controlSize}
                      isDisabled={busy}
                      onPress={() => setRevoking(null)}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </SettingsRow>
  );
}
