import { useContext, useState } from 'react';
import {
  Button,
  TreeItem,
  TreeItemContent,
  TreeStateContext,
} from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type {
  AccountEntity,
  AccountGroupEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import {
  useDeleteAccountGroupMutation,
  useUpdateAccountGroupMutation,
} from '#account-groups';
import { useContextMenu } from '#hooks/useContextMenu';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { AccountRow } from './AccountRow';
import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { DragHandle } from './DragHandle';
import { SidebarBalance } from './SidebarBalance';
import { dropZoneStyle, groupLabelStyle } from './styles';
import { SyncErrorRollup } from './SyncErrorRollup';
import { treeKeys } from './treeKeys';

type AccountGroupHeaderProps = {
  group: AccountGroupEntity;
  side: 'on' | 'off';
  accounts: AccountEntity[];
  failedCount: number;
  showSyncDot: boolean;
  isDropZoneActive: boolean;
};

export function AccountGroupHeader({
  group,
  side,
  accounts,
  failedCount,
  showSyncDot,
  isDropZoneActive,
}: AccountGroupHeaderProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const updateGroup = useUpdateAccountGroupMutation();
  const deleteGroup = useDeleteAccountGroupMutation();

  const [rowElement, setRowElement] = useState<HTMLDivElement | null>(null);
  useContextMenu({
    triggerRef: { current: rowElement },
    items: [
      {
        name: 'account-group-rename',
        text: t('Rename group'),
        onClick: () => setIsEditing(true),
      },
      {
        name: 'account-group-delete',
        text: t('Delete group'),
        onClick: () =>
          dispatch(
            pushModal({
              modal: {
                name: 'confirm-delete',
                options: {
                  message: t(
                    'Are you sure you want to delete the group "{{name}}"? Any accounts in it will be kept but left ungrouped.',
                    { name: group.name },
                  ),
                  onConfirm: () => deleteGroup.mutate({ id: group.id }),
                },
              },
            }),
          ),
      },
    ],
  });

  const treeState = useContext(TreeStateContext);
  const key = treeKeys.group(group.id);

  return (
    <TreeItem
      ref={setRowElement}
      id={key}
      textValue={group.name}
      onAction={() => treeState?.toggleKey(key)}
      className={css({
        outline: 'none',
        borderRadius: radius.sm,
        marginBottom: spacing.xxs,
        ...(isDropZoneActive && dropZoneStyle),
        '&[data-dragging]': { opacity: 0.5 },
      })}
    >
      <TreeItemContent>
        {({ isExpanded }) => (
          <View
            className={css({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingBlock: spacing.xs,
              paddingLeft: spacing.xs,
              paddingRight: spacing.sm,
              borderRadius: radius.sm,
              cursor: 'pointer',
              '[data-hovered] > &, [data-focus-visible] > &': {
                backgroundColor: theme.sidebarItemBackgroundHover,
              },
            })}
          >
            <Button
              slot="chevron"
              aria-label={
                isExpanded
                  ? t('Collapse {{group}}', { group: group.name })
                  : t('Expand {{group}}', { group: group.name })
              }
              className={css({
                display: 'flex',
                alignItems: 'center',
                padding: spacing.xxs,
                border: 'none',
                background: 'none',
                color: 'inherit',
                cursor: 'pointer',
                outline: 'none',
              })}
            >
              <CollapseChevron isOpen={isExpanded} />
            </Button>
            {isEditing ? (
              <InitialFocus>
                <Input
                  aria-label={t('Group name')}
                  style={{ flex: 1, padding: 0, fontSize: 12 }}
                  defaultValue={group.name}
                  onKeyDown={e => e.stopPropagation()}
                  onEnter={newGroupName => {
                    if (newGroupName.trim() !== '') {
                      updateGroup.mutate({ id: group.id, name: newGroupName });
                    }
                    setIsEditing(false);
                  }}
                  onEscape={() => setIsEditing(false)}
                  onBlur={() => setIsEditing(false)}
                />
              </InitialFocus>
            ) : (
              <>
                <Text style={{ ...groupLabelStyle, ...styles.ellipsisText }}>
                  {group.name}
                </Text>
                {!isExpanded && <CountPill count={accounts.length} />}
                <SyncErrorRollup count={failedCount} />
                <View style={{ flex: 1 }} />
                <SidebarBalance
                  binding={bindings.accountGroupBalance(
                    group.id,
                    side === 'off',
                  )}
                  style={{ fontSize: 11, color: groupLabelStyle.color }}
                />
              </>
            )}
            <DragHandle />
          </View>
        )}
      </TreeItemContent>
      {accounts.map(account => (
        <AccountRow
          key={treeKeys.account(account.id)}
          account={account}
          showSyncDot={showSyncDot}
        />
      ))}
    </TreeItem>
  );
}
