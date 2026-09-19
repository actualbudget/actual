import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { radius, spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import type { AccountGroupEntity } from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import {
  useDeleteAccountGroupMutation,
  useUpdateAccountGroupMutation,
} from '#account-groups';
import { useContextMenu } from '#hooks/useContextMenu';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { CollapseChevron } from './CollapseChevron';
import { CountPill } from './CountPill';
import { SidebarBalance } from './SidebarBalance';
import { groupLabelStyle } from './styles';
import { SyncErrorRollup } from './SyncErrorRollup';

type AccountGroupHeaderProps = {
  group: AccountGroupEntity;
  side: 'on' | 'off';
  accountCount: number;
  failedCount: number;
  isOpen: boolean;
  onToggle: () => void;
};

export function AccountGroupHeader({
  group,
  side,
  accountCount,
  failedCount,
  isOpen,
  onToggle,
}: AccountGroupHeaderProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const updateGroup = useUpdateAccountGroupMutation();
  const deleteGroup = useDeleteAccountGroupMutation();

  const triggerRef = useRef<HTMLButtonElement>(null);
  useContextMenu({
    triggerRef,
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

  if (isEditing) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingBlock: spacing.xs,
          paddingLeft: spacing.xs,
          paddingRight: spacing.sm,
        }}
      >
        <CollapseChevron isOpen={isOpen} size={11} />
        <InitialFocus>
          <Input
            aria-label={t('Group name')}
            style={{ flex: 1, padding: 0, fontSize: 12 }}
            defaultValue={group.name}
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
      </View>
    );
  }

  return (
    <Button
      ref={triggerRef}
      variant="bare"
      aria-expanded={isOpen}
      onPress={onToggle}
      className={css({
        '&[data-hovered], &[data-focus-visible]': {
          backgroundColor: theme.sidebarItemBackgroundHover,
        },
      })}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: spacing.xs,
        paddingBlock: spacing.xs,
        paddingLeft: spacing.xs,
        paddingRight: spacing.sm,
        borderRadius: radius.sm,
        width: '100%',
      }}
    >
      <CollapseChevron isOpen={isOpen} size={11} />
      <Text style={{ ...groupLabelStyle, ...styles.ellipsisText }}>
        {group.name}
      </Text>
      {!isOpen && <CountPill count={accountCount} />}
      <SyncErrorRollup count={failedCount} />
      <View style={{ flex: 1 }} />
      <SidebarBalance
        binding={bindings.accountGroupBalance(group.id, side === 'off')}
        style={{ fontSize: 11, color: groupLabelStyle.color }}
      />
    </Button>
  );
}
