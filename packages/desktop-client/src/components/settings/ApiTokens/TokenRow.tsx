import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { ApiToken } from '@actual-app/core/server/auth/app';

import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { formatDate } from './utils';

export function TokenRow({
  token,
  onRevoke,
  onToggleEnabled,
}: {
  token: ApiToken;
  onRevoke: (id: string) => Promise<void>;
  onToggleEnabled: (id: string, enabled: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [revoking, setRevoking] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggleEnabled(token.id, !token.enabled);
    setToggling(false);
  };

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
      <View style={{ flex: 1, opacity: token.enabled ? 1 : 0.5 }}>
        <Text style={{ fontWeight: 600 }}>
          {token.name}
          {!token.enabled && (
            <Text
              style={{
                fontWeight: 400,
                fontSize: 12,
                color: theme.pageTextSubdued,
              }}
            >
              {' '}
              <Trans>(disabled)</Trans>
            </Text>
          )}
        </Text>
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
          {' · '}
          <Trans>Expires:</Trans> {formatDate(token.expiresAt, t)}
        </Text>
      </View>
      <Button variant="bare" onPress={handleToggle} isDisabled={toggling}>
        {toggling ? (
          <Trans>Updating...</Trans>
        ) : token.enabled ? (
          <Trans>Disable</Trans>
        ) : (
          <Trans>Enable</Trans>
        )}
      </Button>
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
