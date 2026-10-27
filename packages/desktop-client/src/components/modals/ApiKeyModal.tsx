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

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ApiKeyModalProps = Extract<ModalType, { name: 'api-key' }>['options'];

export function ApiKeyModal({ fileId, apiKey, onChange }: ApiKeyModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const size = isNarrowWidth ? 'extra-large' : 'medium';
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(close: () => void) {
    setBusy(true);
    setError('');
    try {
      if (apiKey) {
        const result = await sendCatch('api-keys-revoke', { id: apiKey.id });
        if (result.error) throw result.error;
        close();
      } else {
        const result = await sendCatch('api-keys-create', {
          fileId,
          name: name.trim(),
        });
        if (result.error) throw result.error;
        setSecret(result.data.key);
      }
      onChange();
    } catch {
      setError(
        apiKey
          ? t(
              'Could not revoke the API key. Check your connection and try again.',
            )
          : t(
              'Could not create the API key. Check your connection and try again.',
            ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal name="api-key" ariaLabelledBy="api-key-modal-title">
      {({ state }) => (
        <>
          <ModalHeader
            title={
              <span id="api-key-modal-title">
                {apiKey ? t('Revoke API key') : t('Add API key')}
              </span>
            }
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <form
            onSubmit={event => {
              event.preventDefault();
              if (!busy && !secret && (apiKey || name.trim())) {
                void submit(() => state.close());
              }
            }}
          >
            <View style={{ gap: spacing.md }}>
              {secret ? (
                <>
                  <label htmlFor="new-api-key">
                    <Trans>
                      Copy this key now. You cannot view it again after closing
                      this message.
                    </Trans>
                  </label>
                  <Input
                    size={size}
                    id="new-api-key"
                    autoFocus
                    value={secret}
                    readOnly
                    onFocus={event => event.target.select()}
                    style={{ width: '100%' }}
                  />
                </>
              ) : apiKey ? (
                <Text style={{ overflowWrap: 'anywhere' }}>
                  <Trans>
                    Revoke "{{ name: apiKey.name }}"? Integrations using it will
                    lose server access. Previously downloaded data will remain
                    on their devices.
                  </Trans>
                </Text>
              ) : (
                <>
                  <label htmlFor="api-key-name">
                    <Trans>Key name</Trans>
                  </label>
                  <Input
                    size={size}
                    id="api-key-name"
                    autoFocus
                    value={name}
                    maxLength={100}
                    required
                    onChange={event => setName(event.target.value)}
                    placeholder={t('e.g. Transaction importer')}
                  />
                </>
              )}
              {error && (
                <Text role="alert" style={{ color: theme.errorText }}>
                  {error}
                </Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'flex-end',
                  gap: spacing.sm,
                }}
              >
                {secret ? (
                  <Button size={size} onPress={() => state.close()}>
                    <Trans>Done</Trans>
                  </Button>
                ) : (
                  <>
                    <Button
                      size={size}
                      autoFocus={!!apiKey}
                      isDisabled={busy}
                      onPress={() => state.close()}
                    >
                      <Trans>Cancel</Trans>
                    </Button>
                    <Button
                      size={size}
                      variant="primary"
                      type="submit"
                      isDisabled={busy || (!apiKey && !name.trim())}
                    >
                      {apiKey ? t('Revoke key') : t('Create key')}
                    </Button>
                  </>
                )}
              </View>
            </View>
          </form>
        </>
      )}
    </Modal>
  );
}
