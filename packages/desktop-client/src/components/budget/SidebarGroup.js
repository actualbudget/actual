import React, { useState } from 'react';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import CheveronDown from '../../icons/v1/CheveronDown';
import { colors } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import Text from '../common/Text';
import View from '../common/View';
import NotesButton from '../NotesButton';
import { InputCell } from '../table';
import { Tooltip } from '../tooltips';

function SidebarGroup({
  group,
  editing,
  collapsed,
  dragPreview,
  innerRef,
  style,
  borderColor = colors.border,
  onEdit,
  onSave,
  onDelete,
  onShowNewCategory,
  onHideNewGroup,
  onToggleCollapse,
}) {
  const temporary = group.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onClick={e => {
        onToggleCollapse(group.id);
      }}
    >
      {!dragPreview && (
        <ExpandArrow
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
          <View style={{ marginLeft: 5, flexShrink: 0 }}>
            <Button
              type="bare"
              onClick={e => {
                e.stopPropagation();
                setMenuOpen(true);
              }}
              style={{ padding: 3 }}
            >
              <CheveronDown width={14} height={14} />
            </Button>
            {menuOpen && (
              <Tooltip
                position="bottom-left"
                width={200}
                style={{ padding: 0 }}
                onClose={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={type => {
                    if (type === 'rename') {
                      onEdit(group.id);
                    } else if (type === 'add-category') {
                      onShowNewCategory(group.id);
                    } else if (type === 'delete') {
                      onDelete(group.id);
                    } else if (type === 'toggleVisibility') {
                      onSave({ ...group, hidden: !group.hidden });
                    }
                    setMenuOpen(false);
                  }}
                  items={[
                    { name: 'add-category', text: 'Add category' },
                    {
                      name: 'toggleVisibility',
                      text: group.hidden ? 'Show' : 'Hide',
                    },
                    { name: 'rename', text: 'Rename' },
                    onDelete && { name: 'delete', text: 'Delete' },
                  ]}
                />
              </Tooltip>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <NotesButton id={group.id} />
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
        backgroundColor: colors.n11,
        '& button': { display: 'none' },
        '&:hover button': { display: 'flex', color: colors.n1 },
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
        formatter={value => displayed}
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

export default SidebarGroup;
