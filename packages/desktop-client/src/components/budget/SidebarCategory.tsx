// @ts-strict-ignore
import React, { type CSSProperties, type Ref, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/types/models';

import { CategoryAutomationButton } from './goals/CategoryAutomationButton';

import { NotesButton } from '@desktop-client/components/NotesButton';
import { InputCell } from '@desktop-client/components/table';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

type SidebarCategoryProps = {
  innerRef: Ref<HTMLDivElement>;
  category: CategoryEntity;
  categoryGroup?: CategoryGroupEntity;
  dragPreview?: boolean;
  dragging?: boolean;
  editing: boolean;
  goalsShown?: boolean;
  style?: CSSProperties;
  borderColor?: string;
  isLast?: boolean;
  onEditName: (id: CategoryEntity['id']) => void;
  onSave: (category: CategoryEntity) => void;
  onDelete: (id: CategoryEntity['id']) => Promise<void>;
  onHideNewCategory?: () => void;
};

export function SidebarCategory({
  innerRef,
  category,
  categoryGroup,
  dragPreview,
  dragging,
  editing,
  goalsShown = false,
  style,
  isLast,
  onEditName,
  onSave,
  onDelete,
  onHideNewCategory,
}: SidebarCategoryProps) {
  const { t } = useTranslation();
  const isGoalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;

  const temporary = category.id === 'new';
  const { setMenuOpen, menuOpen, handleContextMenu, resetPosition, position } =
    useContextMenu();
  const triggerRef = useRef(null);

  const displayed = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        opacity: category.hidden || categoryGroup?.hidden ? 0.33 : undefined,
        backgroundColor: 'transparent',
        height: 20,
      }}
      ref={triggerRef}
      onContextMenu={handleContextMenu}
    >
      <TextOneLine data-testid="category-name">{category.name}</TextOneLine>
      <View style={{ flexShrink: 0, marginLeft: 5 }}>
        <Button
          variant="bare"
          className="hover-visible"
          style={{ color: 'currentColor', padding: 3 }}
          onPress={() => {
            resetPosition();
            setMenuOpen(true);
          }}
        >
          <SvgCheveronDown
            width={14}
            height={14}
            style={{ color: 'currentColor' }}
          />
        </Button>

        <Popover
          triggerRef={triggerRef}
          placement="bottom start"
          isOpen={menuOpen}
          onOpenChange={() => setMenuOpen(false)}
          style={{ width: 200, margin: 1 }}
          isNonModal
          {...position}
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
              { name: 'rename', text: t('Rename') },
              !categoryGroup?.hidden && {
                name: 'toggle-visibility',
                text: category.hidden ? t('Show') : t('Hide'),
              },
              { name: 'delete', text: t('Delete') },
            ]}
          />
        </Popover>
      </View>
      <View style={{ flex: 1 }} />
      {!goalsShown && isGoalTemplatesUIEnabled && (
        <View style={{ flexShrink: 0 }}>
          <CategoryAutomationButton
            style={dragging && { color: 'currentColor' }}
            defaultColor={theme.pageTextLight}
          />
        </View>
      )}
      <View style={{ flexShrink: 0 }}>
        <NotesButton
          id={category.id}
          style={dragging && { color: 'currentColor' }}
          defaultColor={theme.pageTextLight}
        />
      </View>
    </View>
  );

  return (
    <View
      innerRef={innerRef}
      style={{
        width: 200 + 100 * categoryExpandedState,
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
          placeholder: temporary ? t('New category name') : '',
        }}
      />
    </View>
  );
}
