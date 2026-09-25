import { useState } from 'react';
import { TreeItem, TreeItemContent } from 'react-aria-components';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useReopenAccountMutation, useUpdateAccountMutation } from '#accounts';
import { isAccountFailedSync } from '#accounts/syncStatus';
import { useContextMenu } from '#hooks/useContextMenu';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { openAccountCloseModal, pushModal } from '#modals/modalsSlice';
import { useDispatch, useSelector } from '#redux';
import * as bindings from '#spreadsheet/bindings';
import { isTouchDevice } from '#util/isTouchDevice';

import { AccountHoverCard } from './AccountHoverCard';
import { DragHandle } from './DragHandle';
import { SidebarBalance } from './SidebarBalance';
import { SyncDot, useSyncDotLabel } from './SyncDot';
import type { SyncDotStatus } from './SyncDot';
import { treeKeys } from './treeKeys';

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
  const location = useLocation();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const updatedAccounts = useUpdatedAccounts();
  const isUpdated = !isClosed && updatedAccounts.includes(account.id);
  const [isEditing, setIsEditing] = useState(false);
  const href = `/accounts/${account.id}`;
  const isActive = location.pathname === href;

  const reopenAccount = useReopenAccountMutation();
  const updateAccount = useUpdateAccountMutation();

  const isContextMenuOpen = useSelector(state =>
    state.contextMenu.items.some(
      i =>
        typeof i === 'object' && 'name' in i && i.name.startsWith('account-'),
    ),
  );
  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
  useContextMenu({
    triggerRef: { current: rowElement },
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
    <TreeItem
      ref={setRowElement}
      id={treeKeys.account(account.id)}
      textValue={account.name}
      href={isEditing ? undefined : href}
      onAuxClick={e => {
        if (e.button === 1 && !isEditing) {
          window.open(href, '_blank');
        }
      }}
      className={css({
        outline: 'none',
        borderRadius: radius.sm,
        cursor: 'pointer',
        color: isClosed ? theme.sidebarTextMuted : theme.sidebarItemText,
        ...(isUpdated && {
          fontWeight: 700,
          color: theme.sidebarItemTextUpdated,
        }),
        ...(isActive && {
          backgroundColor: theme.sidebarItemBackgroundSelected,
          color: theme.sidebarItemTextSelected,
          fontWeight: 'normal',
        }),
        '&[data-hovered], &[data-focus-visible]': {
          backgroundColor: isActive
            ? theme.sidebarItemBackgroundSelected
            : theme.sidebarItemBackgroundHover,
        },
        '&[data-dragging]': { opacity: 0.5 },
      })}
    >
      <TreeItemContent>
        {({ level }) => (
          <AccountHoverCard
            account={account}
            isDisabled={isContextMenuOpen || isEditing}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.xs,
                paddingBlock: spacing.xs,
                paddingRight: spacing.sm,
                paddingLeft: level > 1 ? spacing.xs + spacing.sm : spacing.xs,
                fontSize: 13,
                textDecoration: isClosed ? 'line-through' : 'none',
              }}
            >
              <View
                style={{
                  width: spacing.lg,
                  flexShrink: 0,
                  alignItems: 'center',
                }}
              >
                {showSyncDot && <SyncDot status={status} />}
              </View>
              {isEditing ? (
                <InitialFocus>
                  <Input
                    aria-label={t('Account name')}
                    style={{ flex: 1, padding: 0, fontSize: 13 }}
                    defaultValue={account.name}
                    onKeyDown={e => e.stopPropagation()}
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
                style={{
                  fontSize: 12,
                  color: 'inherit',
                  marginLeft: spacing.xs,
                }}
              />
              <DragHandle />
            </View>
          </AccountHoverCard>
        )}
      </TreeItemContent>
    </TreeItem>
  );
}
