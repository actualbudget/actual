import type React from 'react';
import { useState, type ComponentPropsWithoutRef } from 'react';

import { evalArithmetic } from 'loot-core/src/shared/arithmetic';
import { integerToCurrency, amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { CategoryAutocomplete } from '../../autocomplete/CategoryAutocomplete';
import { Button } from '../../common/Button';
import { InitialFocus } from '../../common/InitialFocus';
import { Input } from '../../common/Input';
import { View } from '../../common/View';
import { Tooltip } from '../../tooltips';
import { addToBeBudgetedGroup } from '../util';

type TransferTooltipProps = ComponentPropsWithoutRef<typeof Tooltip> & {
  initialAmount?: number;
  showToBeBudgeted?: boolean;
  onSubmit: (amount: number, categoryId: string) => void;
};

export function TransferTooltip({
  initialAmount = 0,
  showToBeBudgeted,
  onSubmit,
  onClose,
  position = 'bottom-right',
  ...props
}: TransferTooltipProps) {
  const _onSubmit = (amount: number, categoryId: string) => {
    onSubmit?.(amount, categoryId);
    onClose?.();
  };

  return (
    <Tooltip
      position={position}
      width={200}
      style={{ padding: 10 }}
      onClose={onClose}
      {...props}
    >
      <Transfer amount={initialAmount} showToBeBudgeted onSubmit={_onSubmit} />
    </Tooltip>
  );
}

type TransferProps = {
  amount: number;
  showToBeBudgeted: boolean;
  onSubmit: (amount: number, categoryId: string) => void;
};

function Transfer({
  amount: initialAmount,
  showToBeBudgeted,
  onSubmit,
}: TransferProps) {
  let { grouped: categoryGroups } = useCategories();
  categoryGroups = categoryGroups.filter(g => !g.is_income);
  if (showToBeBudgeted) {
    categoryGroups = addToBeBudgetedGroup(categoryGroups);
  }

  const _initialAmount = integerToCurrency(Math.max(initialAmount, 0));
  const [amount, setAmount] = useState<string | null>();

  const [categoryId, setCategoryId] = useState<string | null>(null);

  const _onSubmit = (newAmount: string | null, categoryId: string | null) => {
    const parsedAmount = evalArithmetic(newAmount);
    if (parsedAmount && categoryId) {
      onSubmit?.(amountToInteger(parsedAmount), categoryId);
    }
  };

  if (amount === null) {
    // Don't render anything until we have the amount to show. This
    // ensures that the amount field is focused and fully selected
    // when it's initially rendered (instead of being updated
    // afterwards and losing selection)
    return null;
  }

  return (
    <>
      <View style={{ marginBottom: 5 }}>Transfer this amount:</View>
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
        value={categoryGroups.find(g => g.id === categoryId)}
        openOnFocus={true}
        onSelect={(id: string | undefined) => setCategoryId(id || null)}
        inputProps={{
          onEnter: () => _onSubmit(amount, categoryId),
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
          type="primary"
          style={{
            fontSize: 12,
            paddingTop: 3,
            paddingBottom: 3,
          }}
          onClick={() => _onSubmit(amount, categoryId)}
        >
          Transfer
        </Button>
      </View>
    </>
  );
}
