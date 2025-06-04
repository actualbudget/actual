import React, { useMemo, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '@desktop-client/components/budget/util';
import { useCategories } from '@desktop-client/hooks/useCategories';

type TransferMenuProps = {
  categoryId?: CategoryEntity['id'];
  initialAmount?: number;
  showToBeBudgeted?: boolean;
  onSubmit: (amount: number, categoryId: CategoryEntity['id']) => void;
  onClose: () => void;
};

export function TransferMenu({
  categoryId,
  initialAmount = 0,
  showToBeBudgeted,
  onSubmit,
  onClose,
}: TransferMenuProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const filteredCategoryGroups = useMemo(() => {
    const expenseCategoryGroups = originalCategoryGroups.filter(
      g => !g.is_income,
    );
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseCategoryGroups)
      : expenseCategoryGroups;
    return categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
  }, [originalCategoryGroups, categoryId, showToBeBudgeted]);

  const _initialAmount = integerToCurrency(Math.max(initialAmount, 0));
  const [amount, setAmount] = useState<string | null>(null);
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);

  const _onSubmit = (newAmount: string | null, categoryId: string | null) => {
    const parsedAmount = evalArithmetic(newAmount || '');
    if (parsedAmount && categoryId) {
      onSubmit?.(amountToInteger(parsedAmount), categoryId);
    }

    onClose();
  };

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        _onSubmit(amount, toCategoryId);
      }}
    >
      <View style={{ padding: 10 }}>
        <View style={{ marginBottom: 5 }}>
          <Trans>Transfer this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <Input defaultValue={_initialAmount} onUpdate={setAmount} />
          </InitialFocus>
        </View>
        <View style={{ margin: '10px 0 5px 0' }}>To:</View>

        <CategoryAutocomplete
          categoryGroups={filteredCategoryGroups}
          value={null}
          openOnFocus={true}
          onSelect={(id: string | undefined) => setToCategoryId(id || null)}
          inputProps={{
            placeholder: '(none)',
          }}
          showHiddenCategories={true}
        />

        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Transfer</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
