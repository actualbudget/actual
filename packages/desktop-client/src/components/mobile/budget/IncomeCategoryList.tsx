import { type DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { type CategoryEntity } from 'loot-core/types/models';

import { IncomeCategoryListItem } from './IncomeCategoryListItem';

import { moveCategory } from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';

type IncomeCategoryListProps = {
  categories: CategoryEntity[];
  month: string;
  onEditCategory: (id: string) => void;
  onBudgetAction: (month: string, action: string, args: unknown) => void;
};

export function IncomeCategoryList({
  categories,
  month,
  onEditCategory,
  onBudgetAction,
}: IncomeCategoryListProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { dragAndDropHooks } = useDragAndDrop({
    getItems: keys =>
      [...keys].map(
        key =>
          ({
            'text/plain': key as CategoryEntity['id'],
          }) as DragItem,
      ),
    renderDropIndicator: target => {
      return (
        <DropIndicator
          target={target}
          className={css({
            '&[data-drop-target]': {
              height: 4,
              backgroundColor: theme.tableBorderSeparator,
              opacity: 1,
              borderRadius: 4,
            },
          })}
        />
      );
    },
    onReorder: e => {
      const [key] = e.keys;
      const categoryIdToMove = key as CategoryEntity['id'];
      const categoryToMove = categories.find(c => c.id === categoryIdToMove);

      if (!categoryToMove) {
        throw new Error(
          `Internal error: category with ID ${categoryIdToMove} not found.`,
        );
      }

      if (!categoryToMove.group) {
        throw new Error(
          `Internal error: category ${categoryIdToMove} is not in a group and cannot be moved.`,
        );
      }

      const targetCategoryId = e.target.key as CategoryEntity['id'];

      if (e.target.dropPosition === 'before') {
        dispatch(
          moveCategory({
            id: categoryToMove.id,
            groupId: categoryToMove.group,
            targetId: targetCategoryId,
          }),
        );
      } else if (e.target.dropPosition === 'after') {
        const targetCategoryIndex = categories.findIndex(
          c => c.id === targetCategoryId,
        );

        if (targetCategoryIndex === -1) {
          throw new Error(
            `Internal error: category with ID ${targetCategoryId} not found.`,
          );
        }

        const nextToTargetCategory = categories[targetCategoryIndex + 1];

        dispatch(
          moveCategory({
            id: categoryToMove.id,
            groupId: categoryToMove.group,
            // Due to the way `moveCategory` works, we use the category next to the
            // actual target category here because `moveCategory` always shoves the
            // category *before* the target category.
            // On the other hand, using `null` as `targetId` moves the category
            // to the end of the list.
            targetId: nextToTargetCategory?.id || null,
          }),
        );
      }
    },
  });

  return (
    <GridList
      aria-label={t('Income categories')}
      items={categories}
      dragAndDropHooks={dragAndDropHooks}
      dependencies={[month, onEditCategory, onBudgetAction]}
    >
      {category => (
        <IncomeCategoryListItem
          key={category.id}
          value={category}
          month={month}
          onEdit={onEditCategory}
          onBudgetAction={onBudgetAction}
        />
      )}
    </GridList>
  );
}
