import React, { type ComponentPropsWithoutRef, useState } from 'react';
import { useFocusVisible } from 'react-aria';
import { Cell as ReactAriaCell, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from 'loot-core/types/models';

import { NotesButton } from '../NotesButton';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

import { hoverVisibleStyle } from './BudgetCategoriesV2';

type CategoryNameCellProps = ComponentPropsWithoutRef<typeof ReactAriaCell> & {
  month: string;
  category: CategoryEntity;
  categoryGroup: CategoryGroupEntity;
  onRename: (category: CategoryEntity, newName: string) => void;
  onDelete: (category: CategoryEntity) => void;
  onToggleVisibility: (category: CategoryEntity) => void;
};

export function CategoryNameCell({
  month,
  category,
  categoryGroup,
  onRename,
  onDelete,
  onToggleVisibility,
  ...props
}: CategoryNameCellProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const { isFocusVisible } = useFocusVisible();

  return (
    <ReactAriaCell {...props}>
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          className={css({
            paddingLeft: 18,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            ...hoverVisibleStyle,
          })}
        >
          {isRenaming ? (
            <View style={{ flex: 1 }}>
              <Input
                defaultValue={category.name}
                placeholder="Enter category name"
                onBlur={() => setIsRenaming(false)}
                onUpdate={newName => {
                  if (newName !== category.name) {
                    onRename(category, newName);
                  }
                }}
              />
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text>{category.name}</Text>
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
                          // onEditName(category.id);
                          setIsRenaming(true);
                        } else if (type === 'delete') {
                          onDelete(category);
                        } else if (type === 'toggle-visibility') {
                          // onSave({ ...category, hidden: !category.hidden });
                          onToggleVisibility(category);
                        }
                        setIsMenuOpen(false);
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
                </DialogTrigger>
              </View>
              <View>
                <NotesButton
                  id={category.id}
                  defaultColor={theme.pageTextLight}
                />
              </View>
            </>
          )}
        </View>
      </NamespaceContext.Provider>
    </ReactAriaCell>
  );
}
