import { useState } from 'react';
import type { DragItem } from 'react-aria';
import { DropIndicator, GridList, useDragAndDrop } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';

import { useMoveCategoryMutation } from '#budget';
import { findSortDown } from '#components/budget/util';
import { useTouchReorder } from '#hooks/useTouchReorder';
import { useUndo } from '#hooks/useUndo';

import { IncomeCategoryListItem } from './IncomeCategoryListItem';
import { ReorderDropIndicator } from './ReorderDropIndicator';
import { useReorderMode } from './ReorderModeContext';

type IncomeCategoryListProps = {
  categoryGroup: CategoryGroupEntity;
  categories: CategoryEntity[];
  month: string;
  onShowCategory: (id: string) => void;
};

export function IncomeCategoryList({
  categoryGroup,
  categories,
  month,
  onShowCategory,
}: IncomeCategoryListProps) {
  const { t } = useTranslation();
  const moveCategoryMutation = useMoveCategoryMutation();
  const { showUndoNotification } = useUndo();
  const isReordering = useReorderMode();
  const [announcement, setAnnouncement] = useState('');

  function moveCategory(
    id: CategoryEntity['id'],
    targetId: CategoryEntity['id'] | null,
  ) {
    const category = categories.find(c => c.id === id);
    if (!category) {
      return;
    }
    const others = categories.filter(c => c.id !== id);
    const targetIndex = targetId
      ? others.findIndex(c => c.id === targetId)
      : -1;
    const position = (targetIndex === -1 ? others.length : targetIndex) + 1;
    moveCategoryMutation.mutate(
      { id, groupId: categoryGroup.id, targetId },
      {
        onSuccess: () => {
          setAnnouncement(
            t('{{name}} moved to position {{position}} in {{groupName}}', {
              name: category.name,
              position,
              groupName: categoryGroup.name,
            }),
          );
          showUndoNotification({
            message: t('Moved {{name}}', { name: category.name }),
          });
        },
      },
    );
  }

  const touchReorder = useTouchReorder({
    isEnabled: isReordering,
    onMoveCategory: (id, { targetId }) => moveCategory(id, targetId),
  });

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
      const { targetId } = findSortDown(
        categories,
        e.target.dropPosition === 'before' ? 'top' : 'bottom',
        String(e.target.key),
      );
      moveCategory(String(key), targetId);
    },
  });

  return (
    <View
      {...touchReorder.containerProps}
      data-reorder-group-id={categoryGroup.id}
      style={{ position: 'relative' }}
    >
      <GridList
        aria-label={t('Income categories')}
        items={categories}
        dragAndDropHooks={dragAndDropHooks}
        dependencies={[month, onShowCategory, touchReorder.draggingId]}
      >
        {category => (
          <IncomeCategoryListItem
            key={category.id}
            value={category}
            month={month}
            isDragging={category.id === touchReorder.draggingId}
            onShowCategory={onShowCategory}
          />
        )}
      </GridList>
      {touchReorder.indicatorTop != null && (
        <ReorderDropIndicator top={touchReorder.indicatorTop} />
      )}
      <View aria-live="polite" aria-atomic style={styles.visuallyHidden}>
        {announcement}
      </View>
    </View>
  );
}
