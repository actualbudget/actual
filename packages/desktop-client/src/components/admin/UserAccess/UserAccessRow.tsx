// @ts-strict-ignore
import React, { memo } from 'react';

import { type UserAccessEntity } from 'loot-core/types/models/userAccess';

import { useSelectedDispatch } from '../../../hooks/useSelected';
import { theme } from '../../../style';
import { View } from '../../common/View';
import { SelectCell, Row, Cell } from '../../table';

type UserAccessProps = {
  access: UserAccessEntity;
  hovered?: boolean;
  selected?: boolean;
  onHover?: (id: string | null) => void;
};

export const UserAccessRow = memo(
  ({ access, hovered, selected, onHover }: UserAccessProps) => {
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
        onMouseEnter={() => onHover && onHover(access.userId)}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <SelectCell
          exposed={hovered || selected}
          focused={true}
          onSelect={e => {
            dispatchSelected({
              type: 'select',
              id: access.userId,
              isRangeSelect: e.shiftKey,
            });
          }}
          selected={selected}
        />

        <Cell
          name="displayName"
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
            <span>{access.displayName ?? access.userName}</span>
          </View>
        </Cell>
      </Row>
    );
  },
);

UserAccessRow.displayName = 'UserRow';
