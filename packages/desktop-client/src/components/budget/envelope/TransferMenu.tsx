import React, { useMemo, useState } from 'react';
import { Trans } from 'react-i18next';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { View } from '../../common/View';
import { addToBeBudgetedGroup, removeCategoriesFromGroups } from '../util';

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
    <View style={{ padding: 10 }}>
      <View style={{ marginBottom: 5 }}>
        <Trans>Transfer this amount:</Trans>
      </View>
      <View>
        <InitialFocus>
          <Input
            defaultValue={_initialAmount}
            onUpdate={value => setAmount(value)}
            onEnter={() => _onSubmit(amount, toCategoryId)}
          />
        </InitialFocus>
      </View>
      <View style={{ margin: '10px 0 5px 0' }}>To:</View>

      <CategoryAutocomplete
        categoryGroups={filteredCategoryGroups}
        value={null}
        openOnFocus={true}
        onSelect={(id: string | undefined) => setToCategoryId(id || null)}
        inputProps={{
          onEnter: event =>
            !event.defaultPrevented && _onSubmit(amount, toCategoryId),
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
          variant="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3,
          }}
          onPress={() => _onSubmit(amount, toCategoryId)}
        >
          <Trans>Transfer</Trans>
        </Button>
      </View>
    </View>
  );
}
