import { useEffect, useEffectEvent, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  ApiToken,
  ApiTokenCreateResult,
} from '@actual-app/core/server/auth/app';

import { useServerURL } from '#components/ServerContext';
import { Setting } from '#components/settings/UI';
import { pushModal, replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { TokenRow } from './TokenRow';
import { mapApiTokenError } from './utils';

export function ApiTokensSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const serverURL = useServerURL();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTokens = async () => {
    setLoading(true);
    setError(null);

    const result = await send('api-tokens-list');

    if ('error' in result) {
      setError(mapApiTokenError(result.error, t));
      setTokens([]);
    } else {
      setTokens(result.data);
    }

    setLoading(false);
  };

  const loadTokensOnServerChange = useEffectEvent(() => {
    void loadTokens();
  });

  useEffect(() => {
    if (serverURL) {
      loadTokensOnServerChange();
    }
  }, [serverURL]);

  const handleRevoke = async (tokenId: string) => {
    const result = await send('api-tokens-revoke', { tokenId });
    if ('error' in result) {
      setError(mapApiTokenError(result.error, t));
    } else {
      await loadTokens();
    }
  };

  const handleToggleEnabled = async (tokenId: string, enabled: boolean) => {
    const result = await send('api-tokens-update', { tokenId, enabled });
    if ('error' in result) {
      setError(mapApiTokenError(result.error, t));
    } else {
      await loadTokens();
    }
  };

  const handleTokenCreated = (token: ApiTokenCreateResult) => {
    void loadTokens();
    dispatch(
      replaceModal({
        modal: { name: 'show-api-token', options: { token } },
      }),
    );
  };

  if (!serverURL) {
    return null;
  }

  return (
    <Setting
      primaryAction={
        <Button
          variant="normal"
          onPress={() =>
            dispatch(
              pushModal({
                modal: {
                  name: 'create-api-token',
                  options: { onCreated: handleTokenCreated },
                },
              }),
            )
          }
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
            <TokenRow
              key={token.id}
              token={token}
              onRevoke={handleRevoke}
              onToggleEnabled={handleToggleEnabled}
            />
          ))}
        </View>
      )}
    </Setting>
  );
}
