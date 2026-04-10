import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';

import type {
  CategoryEntity,
  CategoryGroupEntity,
  TransactionEntity,
} from 'loot-core/types/models';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { Cell } from '@desktop-client/components/table';

type CategoryCellProps = {
  id: TransactionEntity['id'];
  category: CategoryEntity | null | undefined;
  categoryGroups: CategoryGroupEntity[];
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  isSplit?: boolean;
  showHiddenCategories?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string | null) => void;
};

export function CategoryCell({
  id,
  category,
  categoryGroups,
  focused,
  exposed,
  isPreview,
  isSplit,
  showHiddenCategories,
  onEdit,
  onUpdate,
}: CategoryCellProps) {
  const categoryName = useMemo(() => {
    if (isSplit) {
      return 'Split';
    }
    if (!category) {
      return 'Categorize';
    }
    return category.name;
  }, [category, isSplit]);

  const categoryColor = useMemo(() => {
    if (isSplit) {
      return theme.pageTextSubdued;
    }
    if (!category) {
      return theme.errorText;
    }
    return undefined;
  }, [category, isSplit]);

  return (
    <Cell
      name="category"
      width="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, 'category')}
      value={categoryName}
      valueStyle={{
        color: categoryColor,
        fontStyle: !category ? 'italic' : undefined,
      }}
      style={{ marginLeft: -5 }}
    >
      {exposed && !isPreview && !isSplit && (
        <CategoryAutocomplete
          categoryGroups={categoryGroups}
          value={category?.id || null}
          focused
          clearOnBlur={false}
          showHiddenCategories={showHiddenCategories}
          onUpdate={value => onUpdate('category', value)}
          onSelect={() => undefined}
        />
      )}
    </Cell>
  );
}
