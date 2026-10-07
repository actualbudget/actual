import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import {
  SvgArrowThinDown,
  SvgArrowThinUp,
} from '@actual-app/components/icons/v1';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import type { AccountGroupEntity } from '@actual-app/core/types/models';

import {
  useDeleteAccountGroupMutation,
  useUpdateAccountGroupMutation,
} from '#account-groups';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { SelectedIndicator } from './SelectedIndicator';

type AccountGroupRowProps = {
  group: AccountGroupEntity;
  selected: boolean;
  onSelect: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
};

export function AccountGroupRow({
  group,
  selected,
  onSelect,
  onMoveUp,
  onMoveDown,
}: AccountGroupRowProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const updateGroup = useUpdateAccountGroupMutation();
  const deleteGroup = useDeleteAccountGroupMutation();
  const [isEditing, setIsEditing] = useState(false);

  const onRename = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) {
      setIsEditing(false);
      return;
    }
    updateGroup.mutate(
      { id: group.id, name: trimmed },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const onDelete = () => {
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
    );
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <SelectedIndicator selected={selected} />
      {isEditing ? (
        <InitialFocus>
          <Input
            defaultValue={group.name}
            onEnter={onRename}
            onKeyDown={event => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setIsEditing(false);
              }
            }}
            onBlur={() => setIsEditing(false)}
            style={{ flex: 1 }}
          />
        </InitialFocus>
      ) : (
        <Button
          variant="bare"
          onPress={onSelect}
          style={{ flex: 1, justifyContent: 'flex-start' }}
        >
          <Text style={{ fontWeight: selected ? 600 : 'normal' }}>
            {group.name}
          </Text>
        </Button>
      )}
      {!isEditing && (
        <>
          <Button
            variant="bare"
            aria-label={t('Rename group')}
            onPress={() => setIsEditing(true)}
          >
            <SvgPencil1 style={{ width: 11, height: 11 }} />
          </Button>
          <Button
            variant="bare"
            aria-label={t('Move group up')}
            isDisabled={!onMoveUp}
            onPress={() => onMoveUp?.()}
          >
            <SvgArrowThinUp style={{ width: 11, height: 11 }} />
          </Button>
          <Button
            variant="bare"
            aria-label={t('Move group down')}
            isDisabled={!onMoveDown}
            onPress={() => onMoveDown?.()}
          >
            <SvgArrowThinDown style={{ width: 11, height: 11 }} />
          </Button>
          <Button
            variant="bare"
            aria-label={t('Delete group')}
            onPress={onDelete}
          >
            <SvgDelete style={{ width: 11, height: 11 }} />
          </Button>
        </>
      )}
    </View>
  );
}
