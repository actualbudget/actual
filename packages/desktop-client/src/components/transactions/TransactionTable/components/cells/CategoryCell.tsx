import { useMemo } from 'react';

import { theme } from '@actual-app/components/theme';
import type {
  CategoryEntity,
  CategoryGroupEntity,
  TransactionEntity,
} from '@actual-app/core/types/models';

import { CategoryAutocomplete } from '#components/autocomplete/CategoryAutocomplete';
import { CustomCell } from '#components/table';

type CategoryCellProps = {
  id: TransactionEntity['id'];
  category: CategoryEntity | null | undefined;
  categoryGroups: CategoryGroupEntity[];
  width: number;
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  showSplitOption?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string | null) => void;
  onOpenSplitModal?: () => void;
};

export function CategoryCell({
  id,
  category,
  categoryGroups,
  width,
  focused,
  exposed,
  isPreview,
  showSplitOption,
  onEdit,
  onUpdate,
  onOpenSplitModal,
}: CategoryCellProps) {
  const categoryName = useMemo(() => {
    if (!category) {
      return 'Categorize';
    }
    return category.name;
  }, [category]);

  const categoryColor = useMemo(() => {
    if (!category) {
      return theme.errorText;
    }
    return undefined;
  }, [category]);

  return (
    <CustomCell
      name="category"
      width={width}
      textAlign="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, 'category')}
      value={category?.id || ''}
      formatter={() => categoryName}
      valueStyle={{
        color: categoryColor,
        fontStyle: !category ? 'italic' : undefined,
      }}
      style={{ marginLeft: -5 }}
      onUpdate={value => {
        if (value === 'split') {
          onOpenSplitModal?.();
          return;
        }

        onUpdate('category', value);
      }}
    >
      {({ onBlur, onKeyDown, onUpdate: setValue, onSave, inputStyle }) =>
        !isPreview ? (
          <CategoryAutocomplete
            categoryGroups={categoryGroups}
            value={category?.id || null}
            focused
            clearOnBlur={false}
            showSplitOption={showSplitOption}
            inputProps={{ onBlur, onKeyDown, style: inputStyle }}
            onUpdate={setValue}
            onSelect={onSave}
          />
        ) : null
      }
    </CustomCell>
  );
}
