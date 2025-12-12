import React, { useState, useEffect, useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type ApiToken, type ApiTokenCreateResult } from 'loot-core/server/auth/app';

import { Setting } from './UI';

import { useServerURL } from '@desktop-client/components/ServerContext';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';



function formatDate(timestamp: number | null | undefined, t: (key: string) => string): string {
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
  onRevoke: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [revoking, setRevoking] = useState(false);

  const handleRevoke = async () => {
    if (
      window.confirm(
        t('Are you sure you want to revoke this token? This cannot be undone.'),
      )
    ) {
      setRevoking(true);
      await onRevoke(token.id);
      setRevoking(false);
    }
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
          {token.lastUsedAt && (
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

function CreateTokenModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (token: ApiTokenCreateResult) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('Please enter a name for the token'));
      return;
    }

    setCreating(true);
    setError(null);

    const result = await send('api-tokens-create', { name: name.trim() });

    if ('error' in result) {
      setError(result.error);
      setCreating(false);
    } else {
      onCreated(result.data);
    }
  };

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 20,
          borderRadius: 8,
          minWidth: 400,
          maxWidth: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <Text style={{ fontSize: 18, fontWeight: 600, marginBottom: 15 }}>
          <Trans>Create API Token</Trans>
        </Text>

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

        {error && (
          <Text style={{ color: theme.errorText, marginBottom: 15 }}>
            {error}
          </Text>
        )}

        <View
          style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}
        >
          <Button variant="bare" onPress={onClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            onPress={handleCreate}
            isDisabled={creating}
          >
            {creating ? (
              <Trans>Creating...</Trans>
            ) : (
              <Trans>Create Token</Trans>
            )}
          </Button>
        </View>
      </View>
    </View>
  );
}

function ShowTokenModal({
  token,
  onClose,
}: {
  token: ApiTokenCreateResult;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t('Failed to copy to clipboard'),
          },
        }),
      );
    }
  };

  return (
    <View
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <View
        style={{
          backgroundColor: theme.pageBackground,
          padding: 20,
          borderRadius: 8,
          minWidth: 450,
          maxWidth: '90%',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 600, marginBottom: 15 }}>
          <Trans>Token Created</Trans>
        </Text>

        <Text style={{ marginBottom: 10, color: theme.warningText }}>
          <Trans>
            Copy this token now. You won&#39;t be able to see it again!
          </Trans>
        </Text>

        <View
          style={{
            backgroundColor: theme.tableBackground,
            padding: 10,
            borderRadius: 4,
            marginBottom: 15,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
            border: `1px solid ${theme.tableBorder}`,
          }}
        >
          {token.token}
        </View>

        <View
          style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}
        >
          <Button variant="normal" onPress={handleCopy}>
            {copied ? <Trans>Copied!</Trans> : <Trans>Copy to Clipboard</Trans>}
          </Button>
          <Button variant="primary" onPress={onClose}>
            <Trans>Done</Trans>
          </Button>
        </View>
      </View>
    </View>
  );
}

export function ApiTokensSettings() {
  const serverURL = useServerURL();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newToken, setNewToken] = useState<ApiTokenCreateResult | null>(null);

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
      loadTokens();
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

  const handleTokenCreated = (token: ApiTokenCreateResult) => {
    setShowCreateModal(false);
    setNewToken(token);
    loadTokens();
  };

  if (!serverURL) {
    return null;
  }

  return (
    <Setting
      primaryAction={
        <Button
          variant="normal"
          onPress={() => setShowCreateModal(true)}
          style={{ marginTop: 10 }}
        >
          <Trans>Create API Token</Trans>
        </Button>
      }
    >
      <Text>
        <Trans>
          <strong>API Tokens</strong> allow you to access your budgets
          programmatically using the Actual API. Tokens are long-lived and can
          be scoped to specific budgets.
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

      {showCreateModal && (
        <CreateTokenModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTokenCreated}
        />
      )}

      {newToken && (
        <ShowTokenModal token={newToken} onClose={() => setNewToken(null)} />
      )}
    </Setting>
  );
}
