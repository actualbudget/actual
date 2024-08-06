// @ts-strict-ignore
import React, { type CSSProperties, useRef, useState } from 'react';
import { type ConnectDragSource } from 'react-dnd';

import { SvgExpandArrow } from '../../icons/v0';
import { SvgCheveronDown } from '../../icons/v1';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { NotesButton } from '../NotesButton';
import { InputCell } from '../table';

type SidebarGroupProps = {
  group: {
    id: string;
    hidden: number;
    categories: object[];
    is_income: number;
    name: string;
    sort_order: number;
    tombstone: number;
  };
  editing?: boolean;
  collapsed: boolean;
  dragPreview?: boolean;
  innerRef?: ConnectDragSource;
  style?: CSSProperties;
  onEdit?: (id: string) => void;
  onSave?: (group: object) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onShowNewCategory?: (groupId: string) => void;
  onHideNewGroup?: () => void;
  onToggleCollapse?: (id: string) => void;
};

export function SidebarGroup({
  group,
  editing,
  collapsed,
  dragPreview,
  innerRef,
  style,
  onEdit,
  onSave,
  onDelete,
  onShowNewCategory,
  onHideNewGroup,
  onToggleCollapse,
}: SidebarGroupProps) {
  const temporary = group.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onClick={() => {
        onToggleCollapse(group.id);
      }}
    >
      {!dragPreview && (
        <SvgExpandArrow
          width={8}
          height={8}
          style={{
            marginRight: 5,
            marginLeft: 5,
            flexShrink: 0,
            transition: 'transform .1s',
            transform: collapsed ? 'rotate(-90deg)' : '',
          }}
        />
      )}
      <div
        style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {dragPreview && <Text style={{ fontWeight: 500 }}>Group: </Text>}
        {group.name}
      </div>
      {!dragPreview && (
        <>
          <View style={{ marginLeft: 5, flexShrink: 0 }} ref={triggerRef}>
            <Button
              variant="bare"
              className="hover-visible"
              onPress={() => setMenuOpen(true)}
              style={{ padding: 3 }}
            >
              <SvgCheveronDown width={14} height={14} />
            </Button>

            <Popover
              triggerRef={triggerRef}
              placement="bottom start"
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              style={{ width: 200 }}
            >
              <Menu
                onMenuSelect={type => {
                  if (type === 'rename') {
                    onEdit(group.id);
                  } else if (type === 'add-category') {
                    onShowNewCategory(group.id);
                  } else if (type === 'delete') {
                    onDelete(group.id);
                  } else if (type === 'toggle-visibility') {
                    onSave({ ...group, hidden: !group.hidden });
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'add-category', text: 'Add category' },
                  { name: 'rename', text: 'Rename' },
                  !group.is_income && {
                    name: 'toggle-visibility',
                    text: group.hidden ? 'Show' : 'Hide',
                  },
                  onDelete && { name: 'delete', text: 'Delete' },
                ]}
              />
            </Popover>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ flexShrink: 0 }}>
            <NotesButton
              id={group.id}
              style={dragPreview && { color: 'currentColor' }}
              defaultColor={theme.pageTextLight}
            />
          </View>
        </>
      )}
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={{
        ...style,
        width: 200,
        backgroundColor: theme.tableRowHeaderBackground,
        overflow: 'hidden',
        '& .hover-visible': {
          display: 'none',
        },
        ...(!dragPreview && {
          '&:hover .hover-visible': {
            display: 'flex',
          },
        }),
        ...(dragPreview && {
          paddingLeft: 10,
          zIndex: 10000,
          borderRadius: 6,
          overflow: 'hidden',
        }),
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          onEdit(null);
          e.stopPropagation();
        }
      }}
    >
      <InputCell
        value={group.name}
        formatter={() => displayed}
        width="flex"
        exposed={editing}
        onUpdate={value => {
          if (temporary) {
            if (value === '') {
              onHideNewGroup();
            } else if (value !== '') {
              onSave({ id: group.id, name: value });
            }
          } else {
            onSave({ id: group.id, name: value });
          }
        }}
        onBlur={() => onEdit(null)}
        style={{ fontWeight: 600 }}
        inputProps={{
          style: { marginLeft: 20 },
          placeholder: temporary ? 'New Group Name' : '',
        }}
      />
    </View>
  );
}
