import React, { useState } from 'react';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button';
import { InitialFocus } from '../../common/InitialFocus';
import { View } from '../../common/View';
import { addToBeBudgetedGroup } from '../util';

type CoverMenuProps = {
  showToBeBudgeted?: boolean;
  onSubmit: (categoryId: string) => void;
  onClose: () => void;
};

export function CoverMenu({
  showToBeBudgeted = true,
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
            categoryGroups={categoryGroups}
            value={categoryGroups.find(g => g.id === categoryId)}
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
