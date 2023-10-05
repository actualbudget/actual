import React, { useState } from 'react';

import CheveronDown from '../../icons/v1/CheveronDown';
import { theme } from '../../style';
import Button from '../common/Button';
import Menu from '../common/Menu';
import View from '../common/View';
import NotesButton from '../NotesButton';
import { InputCell } from '../table';
import { Tooltip } from '../tooltips';

function SidebarCategory({
  innerRef,
  category,
  dragPreview,
  dragging,
  editing,
  style,
  borderColor = theme.tableBorder,
  isLast,
  onDragChange,
  onEditMonth,
  onEditName,
  onSave,
  onDelete,
  onHideNewCategory,
}) {
  const temporary = category.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: category.hidden ? 0.33 : undefined,
      }}
    >
      <div
        data-testid="category-name"
        style={{
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        {category.name}
      </div>
      <View style={{ flexShrink: 0, marginLeft: 5 }}>
        <Button
          type="bare"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <CheveronDown
            width={14}
            height={14}
            style={{ color: 'currentColor' }}
          />
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
                  onEditName(category.id);
                } else if (type === 'delete') {
                  onDelete(category.id);
                } else if (type === 'toggleVisibility') {
                  onSave({ ...category, hidden: !category.hidden });
                }
                setMenuOpen(false);
              }}
              items={[
                {
                  name: 'toggleVisibility',
                  text: category.hidden ? 'Show' : 'Hide',
                },
                { name: 'rename', text: 'Rename' },
                { name: 'delete', text: 'Delete' },
              ]}
            />
          </Tooltip>
        )}
      </View>
      <View style={{ flex: 1 }} />
      <NotesButton
        id={category.id}
        style={dragging && { color: 'currentColor' }}
      />
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={{
        width: 200,
        '& button': { display: 'none' },
        ...(!dragging &&
          !dragPreview && {
            '&:hover button': { display: 'flex', color: theme.tableTextHover },
          }),
        ...(dragging && { color: theme.formInputTextPlaceholderSelected }),
        // The zIndex here forces the the view on top of a row below
        // it that may be "collapsed" and show a border on top
        ...(dragPreview && {
          backgroundColor: 'white',
          zIndex: 10000,
          borderRadius: 6,
          overflow: 'hidden',
        }),
        ...style,
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          onEditName(null);
          e.stopPropagation();
        }
      }}
    >
      <InputCell
        value={category.name}
        formatter={value => displayed}
        width="flex"
        exposed={editing || temporary}
        onUpdate={value => {
          if (temporary) {
            if (value === '') {
              onHideNewCategory();
            } else if (value !== '') {
              onSave({ ...category, name: value });
            }
          } else {
            if (value !== category.name) {
              onSave({ ...category, name: value });
            }
          }
        }}
        onBlur={() => onEditName(null)}
        style={{ paddingLeft: 13, ...(isLast && { borderBottomWidth: 0 }) }}
        inputProps={{
          placeholder: temporary ? 'New Category Name' : '',
        }}
      />
    </View>
  );
}

export default SidebarCategory;
