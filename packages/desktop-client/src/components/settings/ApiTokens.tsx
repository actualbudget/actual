import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { ApiToken } from '@actual-app/core/server/auth/app';

import { useServerURL } from '#components/ServerContext';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { Setting } from './UI';

function formatDate(
  timestamp: number | null | undefined,
  t: (key: string) => string,
): string {
  if (timestamp === null || timestamp === undefined || timestamp === -1) {
    return t('Never');
  }
  return new Date(timestamp * 1000).toLocaleDateString();
}

function TokenRow({
  token,
  onRevoke,
}: {
  token: ApiToken;
  onRevoke: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            message: t(
              'Are you sure you want to revoke this token? This cannot be undone.',
            ),
            onConfirm: async () => {
              setRevoking(true);
              await onRevoke(token.id);
              setRevoking(false);
            },
          },
        },
      }),
    );
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        backgroundColor: theme.tableBackground,
        borderRadius: 4,
        marginBottom: 8,
        border: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 600 }}>{token.name}</Text>
        <Text style={{ fontSize: 12, color: theme.pageTextSubdued }}>
          <code>{token.prefix}...</code>
        </Text>
        <Text style={{ fontSize: 11, color: theme.pageTextSubdued }}>
          <Trans>Created:</Trans> {formatDate(token.createdAt, t)}
          {token.lastUsedAt != null && (
            <>
              {' · '}
              <Trans>Last used:</Trans> {formatDate(token.lastUsedAt, t)}
            </>
          )}
          {token.expiresAt !== -1 && (
            <>
              {' · '}
              <Trans>Expires:</Trans> {formatDate(token.expiresAt, t)}
            </>
          )}
        </Text>
      </View>
      <Button
        variant="bare"
        style={{ color: theme.errorText }}
        onPress={handleRevoke}
        isDisabled={revoking}
      >
        {revoking ? <Trans>Revoking...</Trans> : <Trans>Revoke</Trans>}
      </Button>
    </View>
  );
}

export function ApiTokensSettings() {
  const serverURL = useServerURL();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await send('api-tokens-list');

    if ('error' in result) {
      setError(result.error);
      setTokens([]);
    } else {
      setTokens(result.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (serverURL) {
      void loadTokens();
    }
  }, [serverURL, loadTokens]);

  const handleRevoke = async (tokenId: string) => {
    const result = await send('api-tokens-revoke', { tokenId });
    if ('error' in result) {
      setError(result.error);
    } else {
      await loadTokens();
    }
  };

  if (!serverURL) {
    return null;
  }

  return (
    <Setting>
      <Text>
        <Trans>
          <strong>API Tokens</strong> allow you to access your budgets
          programmatically using the Actual API. Tokens created here are
          long-lived and can access any budget available to your account.
        </Trans>
      </Text>

      {loading ? (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>Loading tokens...</Trans>
        </Text>
      ) : error ? (
        <Text style={{ color: theme.errorText }}>{error}</Text>
      ) : tokens.length === 0 ? (
        <Text style={{ color: theme.pageTextSubdued }}>
          <Trans>No API tokens created yet.</Trans>
        </Text>
      ) : (
        <View style={{ marginTop: 10, width: '100%' }}>
          {tokens.map(token => (
            <TokenRow key={token.id} token={token} onRevoke={handleRevoke} />
          ))}
        </View>
      )}
    </Setting>
  );
}
