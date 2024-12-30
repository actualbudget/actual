// @ts-strict-ignore
import React, { memo } from 'react';
import { Trans } from 'react-i18next';

import { PossibleRoles, type UserEntity } from 'loot-core/types/models/user';

import { useSelectedDispatch } from '../../../hooks/useSelected';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';
import { SelectCell, Row, Cell } from '../../table';

type UserDirectoryProps = {
  user: UserEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
  onEditUser?: (user: UserEntity) => void;
};

export const UserDirectoryRow = memo(
  ({ user, hovered, selected, onHover, onEditUser }: UserDirectoryProps) => {
    const dispatchSelected = useSelectedDispatch();
    const borderColor = selected ? theme.tableBorderSelected : 'none';
    const backgroundFocus = hovered;

    return (
      <Row
        height="auto"
        style={{
          fontSize: 13,
          zIndex: selected ? 101 : 'auto',
          borderColor,
          backgroundColor: selected
            ? theme.tableRowBackgroundHighlight
            : backgroundFocus
              ? theme.tableRowBackgroundHover
              : theme.tableBackground,
        }}
        collapsed={true}
        onMouseEnter={() => onHover && onHover(user.id)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        {!user.owner && (
          <SelectCell
            exposed={hovered || selected}
            focused={true}
            onSelect={e => {
              dispatchSelected({
                type: 'select',
                id: user.id,
                isRangeSelect: e.shiftKey,
              });
            }}
            selected={selected}
          />
        )}
        {user.owner && (
          <Cell
            width={20}
            style={{ alignItems: 'center', userSelect: 'none' }}
          />
        )}

        <Cell
          name="userName"
          width="flex"
          plain
          style={{ color: theme.tableText }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              padding: '3px 5px',
            }}
          >
            <span>{user.userName}</span>
          </View>
        </Cell>

        <Cell
          name="displayName"
          width={250}
          plain
          style={{ color: theme.tableText }}
        >
          <View
            style={{
              alignSelf: 'flex-start',
              padding: '3px 5px',
            }}
          >
            <span>{user.displayName}</span>
          </View>
        </Cell>

        <Cell
          name="role"
          width={100}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <View>{PossibleRoles[user.role]}</View>
        </Cell>

        <Cell
          name="enabled"
          width={100}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Checkbox checked={user.enabled} disabled={true} />
        </Cell>

        <Cell
          name="owner"
          width={100}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Checkbox checked={user.owner} disabled={true} />
        </Cell>

        <Cell
          name="edit"
          width={80}
          plain
          style={{ padding: 0, paddingLeft: 5 }}
        >
          <Button
            style={{ margin: 4, fontSize: 14, color: theme.pageTextLink }}
            variant="bare"
            onPress={() => onEditUser?.(user)}
          >
            <Trans>Edit</Trans>
          </Button>
        </Cell>
      </Row>
    );
  },
);

UserDirectoryRow.displayName = 'UserRow';
