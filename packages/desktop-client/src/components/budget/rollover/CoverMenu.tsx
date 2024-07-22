import React, { useState } from 'react';

import { type CategoryGroupEntity } from 'loot-core/types/models/category-group';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button';
import { InitialFocus } from '../../common/InitialFocus';
import { View } from '../../common/View';
import { addToBeBudgetedGroup } from '../util';

function removeSelectedCategory(
  categoryGroups: CategoryGroupEntity[],
  category?: string,
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
  category?: string;
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
  let categoryGroups = originalCategoryGroups.filter(g => !g.is_income);
  categoryGroups = showToBeBudgeted
    ? addToBeBudgetedGroup(categoryGroups)
    : categoryGroups;
  const [categoryId, setCategoryId] = useState<string | null>(null);

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
            categoryGroups={removeSelectedCategory(categoryGroups, category)}
            value={categoryGroups.find(g => g.id === categoryId)}
            openOnFocus={true}
            onSelect={(id: string | undefined) => setCategoryId(id || null)}
            inputProps={{
              inputRef: node,
              onKeyDown: e => {
                if (e.key === 'Enter') {
                  submit();
                }
              },
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
          type="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
          }}
          onClick={submit}
        >
          Transfer
        </Button>
      </View>
    </View>
  );
}
