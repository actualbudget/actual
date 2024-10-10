import React, { type FormEvent, useCallback, useMemo, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { type CategoryEntity } from 'loot-core/src/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { View } from '../../common/View';
import { addToBeBudgetedGroup, removeCategoriesFromGroups } from '../util';

type CoverMenuProps = {
  showToBeBudgeted?: boolean;
  categoryId?: CategoryEntity['id'];
  onSubmit: (categoryId: CategoryEntity['id']) => void;
  onClose: () => void;
};

export function CoverMenu({
  showToBeBudgeted = true,
  categoryId,
  onSubmit,
  onClose,
}: CoverMenuProps) {
  const { t } = useTranslation();

  const { grouped: originalCategoryGroups } = useCategories();

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);

  const filteredCategoryGroups = useMemo(() => {
    const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;
    return categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
  }, [categoryId, showToBeBudgeted, originalCategoryGroups]);

  const onSubmitInner = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (fromCategoryId) {
        onSubmit(fromCategoryId);
      }
      onClose();
    },
    [fromCategoryId, onSubmit, onClose],
  );

  return (
    <Form onSubmit={onSubmitInner}>
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Cover from category:</Trans>
        </View>

        <CategoryAutocomplete
          categoryGroups={filteredCategoryGroups}
          value={null}
          openOnFocus={true}
          onSelect={(id: string | undefined) => setFromCategoryId(id || null)}
          inputProps={{
            placeholder: t('(none)'),
          }}
          showHiddenCategories={false}
          autoFocus
        />

        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            variant="primary"
            type="submit"
            style={{
              fontSize: 12,
              paddingTop: 3,
            }}
          >
            <Trans>Transfer</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
