import React, { useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import { evalArithmetic } from 'loot-core/shared/arithmetic';
import { amountToInteger, integerToCurrency } from 'loot-core/shared/util';

import { useCategories } from '../../hooks/useCategories';
import { styles } from '../../style';
import { addToBeBudgetedGroup } from '../budget/util';
import { Button } from '../common/Button';
import { InitialFocus } from '../common/InitialFocus';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel, InputField, TapField } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';

type TransferModalProps = {
  modalProps: CommonModalProps;
  categoryId: string;
  amount: number;
  showToBeBudgeted: boolean;
  onSubmit: (amount: number, categoryId: string) => void;
};

export function TransferModal({
  modalProps,
  categoryId: fromCategoryId,
  amount: initialAmount,
  showToBeBudgeted,
  onSubmit,
}: TransferModalProps) {
  const { grouped: originalCategoryGroups, list: categories } = useCategories();
  let categoryGroups = originalCategoryGroups.filter(g => !g.is_income);
  if (showToBeBudgeted) {
    categoryGroups = addToBeBudgetedGroup(categoryGroups);
  }

  const _initialAmount = integerToCurrency(Math.max(initialAmount, 0));
  const [amount, setAmount] = useState<string | null>(null);
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const onCategoryClick = () => {
    dispatch(
      pushModal('category-autocomplete', {
        categoryGroups,
        onSelect: categoryId => {
          setToCategoryId(categoryId);
        },
      }),
    );
  };

  const _onSubmit = (newAmount: string | null, categoryId: string | null) => {
    const parsedAmount = evalArithmetic(newAmount);
    if (parsedAmount && categoryId) {
      onSubmit?.(amountToInteger(parsedAmount), categoryId);
    }

    modalProps.onClose();
  };

  const fromCategory = categories.find(c => c.id === fromCategoryId);
  return (
    <Modal
      title={`Transfer from ${fromCategory?.name}`}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        borderRadius: '6px',
      }}
    >
      {() => (
        <>
          <View>
            <FieldLabel title="Transfer this amount:" />
            <InitialFocus>
              <InputField
                tabIndex={1}
                defaultValue={_initialAmount}
                onUpdate={value => setAmount(value)}
              />
            </InitialFocus>
          </View>

          <FieldLabel title="To:" />
          <TapField
            tabIndex={2}
            value={categories.find(c => c.id === toCategoryId)?.name}
            onClick={onCategoryClick}
            onFocus={onCategoryClick}
          />

          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
              marginBottom: 10,
            }}
          >
            <Button
              type="primary"
              tabIndex={3}
              style={{
                height: 40,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onClick={() => _onSubmit(amount, toCategoryId)}
            >
              Transfer
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
