// @ts-strict-ignore
import React, { memo } from 'react';

import { PossibleRoles, type UserEntity } from 'loot-core/types/models/user';

import { useSelectedDispatch } from '../../../hooks/useSelected';
import { theme } from '../../../style';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { Checkbox } from '../../forms';
import { BlurredOverlay } from '../../PrivacyFilter';
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
        {!user.master && (
          <SelectCell
            exposed={hovered || selected}
            focused={true}
            onSelect={e => {
              dispatchSelected({ type: 'select', id: user.id, event: e });
            }}
            selected={selected}
          />
        )}
        {user.master && (
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
            <BlurredOverlay blurIntensity="0.15rem">
              <span>{user.userName}</span>
            </BlurredOverlay>
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
          <Checkbox checked={user.enabled} readOnly={true} />
        </Cell>

        <Cell
          name="enabled"
          width={100}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Checkbox checked={user.master} readOnly={true} />
        </Cell>

        <Cell
          name="edit"
          width={80}
          plain
          style={{ padding: '0 15px', paddingLeft: 5 }}
        >
          <Button onPress={() => onEditUser(user)}>Edit</Button>
        </Cell>
      </Row>
    );
  },
);

UserDirectoryRow.displayName = 'UserRow';
