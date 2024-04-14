// @ts-strict-ignore
import React, { type CSSProperties, type Ref, useState } from 'react';

import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/src/types/models';

import { SvgCheveronDown } from '../../icons/v1';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Menu } from '../common/Menu';
import { View } from '../common/View';
import { NotesButton } from '../NotesButton';
import { InputCell } from '../table';
import { Tooltip } from '../tooltips';

type SidebarCategoryProps = {
  innerRef: Ref<HTMLDivElement>;
  category: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  dragPreview?: boolean;
  dragging?: boolean;
  editing: boolean;
  style?: CSSProperties;
  borderColor?: string;
  isLast?: boolean;
  onEditName: (id: string) => void;
  onSave: (group) => void;
  onDelete: (id: string) => Promise<void>;
  onHideNewCategory?: () => void;
};

export function SidebarCategory({
  innerRef,
  category,
  categoryGroup,
  dragPreview,
  dragging,
  editing,
  style,
  isLast,
  onEditName,
  onSave,
  onDelete,
  onHideNewCategory,
}: SidebarCategoryProps) {
  const temporary = category.id === 'new';
  const [menuOpen, setMenuOpen] = useState(false);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: category.hidden || categoryGroup?.hidden ? 0.33 : undefined,
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
          className="hover-visible"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(true);
          }}
          style={{ color: 'currentColor', padding: 3 }}
        >
          <SvgCheveronDown
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
                } else if (type === 'toggle-visibility') {
                  onSave({ ...category, hidden: !category.hidden });
                }
                setMenuOpen(false);
              }}
              items={[
                !categoryGroup?.hidden && {
                  name: 'toggle-visibility',
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
        defaultColor={theme.pageTextLight}
      />
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={{
        width: 200,
        overflow: 'hidden',
        '& .hover-visible': {
          display: 'none',
        },
        ...(!dragging &&
          !dragPreview && {
            '&:hover .hover-visible': {
              display: 'flex',
            },
          }),
        ...(dragging && { color: theme.formInputTextPlaceholderSelected }),
        // The zIndex here forces the the view on top of a row below
        // it that may be "collapsed" and show a border on top
        ...(dragPreview && {
          backgroundColor: theme.tableBackground,
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
        formatter={() => displayed}
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
