import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button2';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { View } from '../../common/View';
import { addToBeBudgetedGroup } from '../util';

type TransferMenuProps = {
  initialAmount?: number;
  showToBeBudgeted?: boolean;
  onSubmit: (amount: number, categoryId: string) => void;
  onClose: () => void;
};

export function TransferMenu({
  initialAmount = 0,
  showToBeBudgeted,
  onSubmit,
  onClose,
}: TransferMenuProps) {
  const { t } = useTranslation();

  const { grouped: originalCategoryGroups } = useCategories();
  const filteredCategoryGroups = originalCategoryGroups.filter(
    g => !g.is_income,
  );
  const categoryGroups = showToBeBudgeted
    ? addToBeBudgetedGroup(filteredCategoryGroups, t)
    : filteredCategoryGroups;

  const _initialAmount = integerToCurrency(Math.max(initialAmount, 0));
  const [amount, setAmount] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

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
            onEnter={() => _onSubmit(amount, categoryId)}
          />
        </InitialFocus>
      </View>
      <View style={{ margin: '10px 0 5px 0' }}>To:</View>

      <CategoryAutocomplete
        categoryGroups={categoryGroups}
        value={categoryGroups.find(g => g.id === categoryId) ?? null}
        openOnFocus={true}
        onSelect={(id: string | undefined) => setCategoryId(id || null)}
        inputProps={{
          onEnter: event =>
            !event.defaultPrevented && _onSubmit(amount, categoryId),
          placeholder: t('(none)'),
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
          onPress={() => _onSubmit(amount, categoryId)}
        >
          <Trans>Transfer</Trans>
        </Button>
      </View>
    </View>
  );
}
