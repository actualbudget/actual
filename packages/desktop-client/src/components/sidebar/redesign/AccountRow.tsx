import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useReopenAccountMutation, useUpdateAccountMutation } from '#accounts';
import { isAccountFailedSync } from '#accounts/syncStatus';
import { Link } from '#components/common/Link';
import { useContextMenu } from '#hooks/useContextMenu';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { openAccountCloseModal, pushModal } from '#modals/modalsSlice';
import { useDispatch, useSelector } from '#redux';
import * as bindings from '#spreadsheet/bindings';
import { isTouchDevice } from '#util/isTouchDevice';

import { AccountHoverCard } from './AccountHoverCard';
import { SidebarBalance } from './SidebarBalance';
import { SyncDot, useSyncDotLabel } from './SyncDot';
import type { SyncDotStatus } from './SyncDot';

type AccountRowProps = {
  account: AccountEntity;
  isClosed?: boolean;
  showSyncDot?: boolean;
};

export function AccountRow({
  account,
  isClosed,
  showSyncDot,
}: AccountRowProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const updatedAccounts = useUpdatedAccounts();
  const isUpdated = !isClosed && updatedAccounts.includes(account.id);
  const [isEditing, setIsEditing] = useState(false);

  const reopenAccount = useReopenAccountMutation();
  const updateAccount = useUpdateAccountMutation();

  const isContextMenuOpen = useSelector(state =>
    state.contextMenu.items.some(
      i =>
        typeof i === 'object' && 'name' in i && i.name.startsWith('account-'),
    ),
  );
  const triggerRef = useRef<HTMLDivElement>(null);
  useContextMenu({
    triggerRef,
    enabled: !isTouchDevice(),
    items: [
      {
        name: 'account-rename',
        text: t('Rename'),
        onClick: () => setIsEditing(true),
      },
      isClosed
        ? {
            name: 'account-reopen',
            text: t('Reopen'),
            onClick: () => reopenAccount.mutate({ id: account.id }),
          }
        : {
            name: 'account-close',
            text: t('Close'),
            onClick: () =>
              dispatch(openAccountCloseModal({ accountId: account.id })),
          },
      {
        name: 'account-group',
        text: t('Set account group'),
        onClick: () =>
          dispatch(
            pushModal({
              modal: {
                name: 'account-groups',
                options: { accountId: account.id },
              },
            }),
          ),
      },
    ],
  });

  let status: SyncDotStatus = 'unlinked';
  if (!isClosed && account.bank) {
    if (isAccountFailedSync(account)) {
      status = 'error';
    } else if (syncingAccountIds.includes(account.id)) {
      status = 'pending';
    } else {
      status = 'synced';
    }
  }
  const statusLabel = useSyncDotLabel(status);

  return (
    <AccountHoverCard
      account={account}
      isDisabled={isContextMenuOpen || isEditing}
    >
      <View innerRef={triggerRef} style={{ flexShrink: 0 }}>
        <Link
          variant="internal"
          to={`/accounts/${account.id}`}
          isDisabled={isEditing}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingBlock: spacing.xs,
            paddingInline: spacing.sm,
            borderRadius: radius.sm,
            fontSize: 13,
            textDecoration: isClosed ? 'line-through' : 'none',
            color: isClosed ? theme.sidebarTextMuted : theme.sidebarItemText,
            ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
            ...(isUpdated && {
              fontWeight: 700,
              color: theme.sidebarItemTextUpdated,
            }),
          }}
          activeStyle={{
            backgroundColor: theme.sidebarItemBackgroundSelected,
            color: theme.sidebarItemTextSelected,
            fontWeight: 'normal',
          }}
        >
          {showSyncDot ? <SyncDot status={status} /> : null}
          {isEditing ? (
            <InitialFocus>
              <Input
                aria-label={t('Account name')}
                style={{ flex: 1, padding: 0, fontSize: 13 }}
                defaultValue={account.name}
                onEnter={newAccountName => {
                  if (newAccountName.trim() !== '') {
                    updateAccount.mutate({
                      account: { id: account.id, name: newAccountName },
                    });
                  }
                  setIsEditing(false);
                }}
                onEscape={() => setIsEditing(false)}
                onBlur={() => setIsEditing(false)}
              />
            </InitialFocus>
          ) : (
            <Text style={{ flex: 1, ...styles.ellipsisText }}>
              {account.name}
            </Text>
          )}
          <Text style={styles.visuallyHidden}>{statusLabel}</Text>
          <SidebarBalance
            binding={bindings.accountBalance(account.id)}
            style={{ fontSize: 12, color: 'inherit' }}
          />
        </Link>
      </View>
    </AccountHoverCard>
  );
}
