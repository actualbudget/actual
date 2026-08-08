import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import type { Modal as ModalType } from '#modals/modalsSlice';

import { mapApiTokenError } from './utils';

type CreateApiTokenModalProps = Extract<
  ModalType,
  { name: 'create-api-token' }
>['options'];

export function CreateApiTokenModal({ onCreated }: CreateApiTokenModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Array<{ fileId: string; name: string }>>(
    [],
  );
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<string[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [expirationDate, setExpirationDate] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const remoteFiles = await send('get-remote-files');
        setFiles(
          (remoteFiles || [])
            .filter(file => !file.deleted)
            .map(file => ({ fileId: file.fileId, name: file.name })),
        );
      } catch {
        setError(t('Failed to load budgets. Please try again.'));
      } finally {
        setLoadingFiles(false);
      }
    })();
  }, [t]);

  const toggleBudget = (fileId: string) => {
    setSelectedBudgetIds(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('Please enter a name for the token'));
      return;
    }

    if (selectedBudgetIds.length === 0) {
      setError(t('Please select at least one budget for this token.'));
      return;
    }

    let expiresAt: number | null = null;
    if (expirationDate) {
      const expirationTimestamp = Math.floor(
        new Date(`${expirationDate}T23:59:59`).getTime() / 1000,
      );
      if (expirationTimestamp <= Math.floor(Date.now() / 1000)) {
        setError(t('The expiration date must be in the future.'));
        return;
      }
      expiresAt = expirationTimestamp;
    }

    setCreating(true);
    setError(null);

    const result = await send('api-tokens-create', {
      name: name.trim(),
      budgetIds: selectedBudgetIds,
      expiresAt,
    });

    if ('error' in result) {
      setError(mapApiTokenError(result.error, t));
      setCreating(false);
    } else {
      onCreated(result.data);
    }
  };

  return (
    <Modal name="create-api-token">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Create API Token')}
            rightContent={
              <ModalCloseButton
                onPress={() => {
                  if (!creating) {
                    state.close();
                  }
                }}
              />
            }
          />
          <View>
            <View style={{ marginBottom: 15 }}>
              <Text style={{ marginBottom: 5 }}>
                <Trans>Token name</Trans>
              </Text>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('My API script')}
                style={{ width: '100%' }}
              />
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ marginBottom: 5 }}>
                <Trans>Budgets</Trans>
              </Text>
              {loadingFiles ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>Loading budgets...</Trans>
                </Text>
              ) : files.length === 0 ? (
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>No budgets available.</Trans>
                </Text>
              ) : (
                <View
                  style={{
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: `1px solid ${theme.tableBorder}`,
                    borderRadius: 4,
                    padding: 8,
                  }}
                >
                  {files.map(file => (
                    <Text
                      key={file.fileId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px 0',
                      }}
                    >
                      <Checkbox
                        id={`api-token-budget-${file.fileId}`}
                        checked={selectedBudgetIds.includes(file.fileId)}
                        onChange={() => toggleBudget(file.fileId)}
                      />
                      <label htmlFor={`api-token-budget-${file.fileId}`}>
                        {file.name}
                      </label>
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={{ marginBottom: 15 }}>
              <Text style={{ marginBottom: 5 }}>
                <Trans>Expiration date (optional)</Trans>
              </Text>
              <Input
                type="date"
                value={expirationDate}
                onChange={e => setExpirationDate(e.target.value)}
                style={{ width: '100%' }}
              />
              <Text
                style={{
                  color: theme.pageTextSubdued,
                  fontSize: 13,
                  marginTop: 5,
                }}
              >
                <Trans>Leave empty for a token that never expires.</Trans>
              </Text>
            </View>

            {error && (
              <Text style={{ color: theme.errorText, marginBottom: 15 }}>
                {error}
              </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                justifyContent: 'flex-end',
              }}
            >
              <Button
                variant="bare"
                onPress={() => state.close()}
                isDisabled={creating}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={() => handleCreate()}
                isDisabled={creating || selectedBudgetIds.length === 0}
              >
                {creating ? (
                  <Trans>Creating...</Trans>
                ) : (
                  <Trans>Create Token</Trans>
                )}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
