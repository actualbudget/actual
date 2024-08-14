import React, { useMemo, useState } from 'react';

import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/src/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { InitialFocus } from '../../common/InitialFocus';
import { View } from '../../common/View';
import { addToBeBudgetedGroup } from '../util';

function removeSelectedCategory(
  categoryGroups: CategoryGroupEntity[],
  category?: CategoryEntity['id'],
) {
  if (!category) return categoryGroups;

  return categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories?.filter(cat => cat.id !== category),
    }))
    .filter(group => group.categories?.length);
}

type CoverMenuProps = {
  showToBeBudgeted?: boolean;
  category?: CategoryEntity['id'];
  onSubmit: (categoryId: string) => void;
  onClose: () => void;
};

export function CoverMenu({
  showToBeBudgeted = true,
  category,
  onSubmit,
  onClose,
}: CoverMenuProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);

  const categoryGroups = showToBeBudgeted
    ? addToBeBudgetedGroup(expenseGroups)
    : expenseGroups;

  const [categoryId, setCategoryId] = useState<string | null>(null);

  const filteredCategoryGroups = useMemo(
    () => removeSelectedCategory(categoryGroups, category),
    [categoryGroups, category],
  );

  function submit() {
    if (categoryId) {
      onSubmit(categoryId);
    }
    onClose();
  }
  return (
    <View style={{ padding: 10 }}>
      <View style={{ marginBottom: 5 }}>Cover from category:</View>

      <InitialFocus>
        {node => (
          <CategoryAutocomplete
            categoryGroups={filteredCategoryGroups}
            value={
              filteredCategoryGroups.find(g => g.id === categoryId) ?? null
            }
            openOnFocus={true}
            onSelect={(id: string | undefined) => setCategoryId(id || null)}
            inputProps={{
              inputRef: node,
              onEnter: event => !event.defaultPrevented && submit(),
              placeholder: '(none)',
            }}
            showHiddenCategories={false}
          />
        )}
      </InitialFocus>

      <View
        style={{
          alignItems: 'flex-end',
          marginTop: 10,
        }}
      >
        <Button
          variant="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
          }}
          onPress={submit}
        >
          Transfer
        </Button>
      </View>
    </View>
  );
}
