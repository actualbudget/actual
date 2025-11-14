// @ts-strict-ignore
import React, { type CSSProperties, type RefCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import {
  type CategoryEntity,
  type CategoryGroupEntity,
} from 'loot-core/types/models';

import { NotesButton } from '@desktop-client/components/NotesButton';
import { InputCell } from '@desktop-client/components/table';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';

type SidebarGroupProps = {
  group: CategoryGroupEntity;
  editing?: boolean;
  collapsed: boolean;
  dragPreview?: boolean;
  innerRef?: RefCallback<HTMLDivElement>;
  style?: CSSProperties;
  onEdit?: (id: CategoryGroupEntity['id']) => void;
  onSave?: (group: CategoryGroupEntity) => void;
  onDelete?: (id: CategoryGroupEntity['id']) => void;
  onApplyBudgetTemplatesInGroup?: (
    categories: Array<CategoryEntity['id']>,
  ) => void;
  onShowNewCategory?: (groupId: CategoryGroupEntity['id']) => void;
  onHideNewGroup?: () => void;
  onToggleCollapse?: (id: CategoryGroupEntity['id']) => void;
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
  onApplyBudgetTemplatesInGroup,
  onShowNewCategory,
  onHideNewGroup,
  onToggleCollapse,
}: SidebarGroupProps) {
  const { t } = useTranslation();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
  const categoryExpandedState = categoryExpandedStatePref ?? 0;

  const temporary = group.id === 'new';
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
        height: 20,
      }}
      ref={triggerRef}
      onClick={() => {
        onToggleCollapse(group.id);
      }}
      onContextMenu={handleContextMenu}
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
          <View style={{ marginLeft: 5, flexShrink: 0 }}>
            <Button
              variant="bare"
              className="hover-visible"
              onPress={() => {
                resetPosition();
                setMenuOpen(true);
              }}
              style={{ padding: 3 }}
            >
              <SvgCheveronDown width={14} height={14} />
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
                    onEdit(group.id);
                  } else if (type === 'delete') {
                    onDelete(group.id);
                  } else if (type === 'toggle-visibility') {
                    onSave({ ...group, hidden: !group.hidden });
                  } else if (type === 'apply-multiple-category-template') {
                    onApplyBudgetTemplatesInGroup?.(
                      group.categories.filter(c => !c.hidden).map(c => c.id),
                    );
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'rename', text: t('Rename') },
                  !group.is_income && {
                    name: 'toggle-visibility',
                    text: group.hidden ? t('Show') : t('Hide'),
                  },
                  onDelete && { name: 'delete', text: t('Delete') },
                  ...(isGoalTemplatesEnabled
                    ? [
                        {
                          name: 'apply-multiple-category-template',
                          text: t('Apply budget templates'),
                        },
                      ]
                    : []),
                ]}
              />
            </Popover>
          </View>
          <View style={{ flex: 1 }} />
          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Tooltip content={t('Add category')} disablePointerEvents>
              <Button
                variant="bare"
                aria-label={t('Add category')}
                className={cx(
                  css({
                    color: theme.pageTextLight,
                  }),
                  'hover-visible',
                )}
                onPress={() => {
                  onShowNewCategory?.(group.id);
                }}
              >
                <SvgAdd style={{ width: 10, height: 10, flexShrink: 0 }} />
              </Button>
            </Tooltip>

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
        width: 200 + 100 * categoryExpandedState,
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
          placeholder: temporary ? t('New group name') : '',
        }}
      />
    </View>
  );
}
