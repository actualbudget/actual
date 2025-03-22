import React, { type ComponentPropsWithoutRef, useState } from 'react';
import { useFocusVisible } from 'react-aria';
import { Cell as ReactAriaCell, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';
import type { CategoryGroupEntity } from 'loot-core/types/models';

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { NotesButton } from '../NotesButton';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { hoverVisibleStyle } from './BudgetCategoriesV2';

type CategoryGroupNameCellProps = ComponentPropsWithoutRef<
  typeof ReactAriaCell
> & {
  month: string;
  categoryGroup: CategoryGroupEntity;
  isCollapsed: boolean;
  onToggleCollapse: (categoryGroup: CategoryGroupEntity) => void;
  onAddCategory: (categoryGroup: CategoryGroupEntity) => void;
  onRename: (categoryGroup: CategoryGroupEntity, newName: string) => void;
  onDelete: (categoryGroup: CategoryGroupEntity) => void;
  onToggleVisibilty: (categoryGroup: CategoryGroupEntity) => void;
  onApplyBudgetTemplatesInGroup: (categoryGroup: CategoryGroupEntity) => void;
};

export function CategoryGroupNameCell({
  month,
  categoryGroup,
  isCollapsed,
  onToggleCollapse,
  onAddCategory,
  onRename,
  onDelete,
  onToggleVisibilty,
  onApplyBudgetTemplatesInGroup,
  ...props
}: CategoryGroupNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const { isFocusVisible } = useFocusVisible();

  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            paddingLeft: 5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...hoverVisibleStyle,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Button
              variant="bare"
              onPress={() => onToggleCollapse(categoryGroup)}
              isDisabled={isRenaming}
            >
              <SvgExpandArrow
                width={8}
                height={8}
                style={{
                  flexShrink: 0,
                  transition: 'transform .1s',
                  transform: isCollapsed ? 'rotate(-90deg)' : '',
                }}
              />
            </Button>
            {isRenaming ? (
              <View style={{ flex: 1 }}>
                <Input
                  autoFocus
                  defaultValue={categoryGroup.name}
                  onBlur={() => setIsRenaming(false)}
                  onEscape={() => setIsRenaming(false)}
                  onUpdate={newName => {
                    if (newName !== categoryGroup.name) {
                      onRename(categoryGroup, newName);
                    }
                  }}
                />
              </View>
            ) : (
              <>
                <Text style={{ fontWeight: 600 }}>{categoryGroup.name}</Text>
                <DialogTrigger>
                  <Button
                    variant="bare"
                    className={cx(
                      { 'hover-visible': !isMenuOpen && !isFocusVisible },
                      css({ marginLeft: 5 }),
                    )}
                    onPress={() => {
                      // resetPosition();
                      setIsMenuOpen(true);
                    }}
                  >
                    <SvgCheveronDown width={12} height={12} />
                  </Button>

                  <Popover
                    placement="bottom start"
                    isOpen={isMenuOpen}
                    onOpenChange={() => setIsMenuOpen(false)}
                    isNonModal
                  >
                    <Menu
                      onMenuSelect={type => {
                        if (type === 'rename') {
                          // onEdit(categoryGroup.id);
                          setIsRenaming(true);
                        } else if (type === 'add-category') {
                          onAddCategory(categoryGroup);
                        } else if (type === 'delete') {
                          onDelete(categoryGroup);
                        } else if (type === 'toggle-visibility') {
                          // onSave({ ...categoryGroup, hidden: !categoryGroup.hidden });
                          onToggleVisibilty(categoryGroup);
                        } else if (
                          type === 'apply-multiple-category-template'
                        ) {
                          onApplyBudgetTemplatesInGroup(categoryGroup);
                        }
                        setIsMenuOpen(false);
                      }}
                      items={[
                        { name: 'add-category', text: t('Add category') },
                        { name: 'rename', text: t('Rename') },
                        !categoryGroup.is_income && {
                          name: 'toggle-visibility',
                          text: categoryGroup.hidden ? 'Show' : 'Hide',
                        },
                        // onDelete && { name: 'delete', text: t('Delete') },
                        { name: 'delete', text: t('Delete') },
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
                </DialogTrigger>
              </>
            )}
          </View>
          {!isRenaming && (
            <View>
              <NotesButton
                id={categoryGroup.id}
                defaultColor={theme.pageTextLight}
              />
            </View>
          )}
        </View>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
