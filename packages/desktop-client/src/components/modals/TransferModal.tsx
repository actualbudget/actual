import React, { useMemo, useState } from 'react';
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
  title: string;
  month: string;
  amount: number;
  showToBeBudgeted: boolean;
  onSubmit: (amount: number, toCategoryId: string) => void;
};

export function TransferModal({
  modalProps,
  title,
  month,
  amount: initialAmount,
  showToBeBudgeted,
  onSubmit,
}: TransferModalProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    let expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    expenseGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;
    const expenseCategories = expenseGroups.flatMap(g => g.categories || []);
    return [expenseGroups, expenseCategories];
  }, [originalCategoryGroups, showToBeBudgeted]);

  const _initialAmount = integerToCurrency(Math.max(initialAmount, 0));
  const [amount, setAmount] = useState<string | null>(null);
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const openCategoryModal = () => {
    dispatch(
      pushModal('category-autocomplete', {
        categoryGroups,
        month,
        showHiddenCategories: true,
        onSelect: categoryId => {
          setToCategoryId(categoryId);
        },
      }),
    );
  };

  const _onSubmit = (newAmount: string | null, categoryId: string | null) => {
    const parsedAmount = evalArithmetic(newAmount || '');
    if (parsedAmount && categoryId) {
      onSubmit?.(amountToInteger(parsedAmount), categoryId);
    }

    modalProps.onClose();
  };

  const toCategory = categories.find(c => c.id === toCategoryId);

  return (
    <Modal title={title} showHeader focusAfterClose={false} {...modalProps}>
      <View>
        <View>
          <FieldLabel title="Transfer this amount:" />
          <InitialFocus>
            <InputField
              inputMode="decimal"
              tabIndex={0}
              defaultValue={_initialAmount}
              onUpdate={setAmount}
              onEnter={() => {
                if (!toCategoryId) {
                  openCategoryModal();
                }
              }}
            />
          </InitialFocus>
        </View>

        <FieldLabel title="To:" />
        <TapField
          tabIndex={0}
          value={toCategory?.name}
          onClick={openCategoryModal}
        />

        <View
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: 10,
          }}
        >
          <Button
            type="primary"
            tabIndex={0}
            style={{
              height: styles.mobileMinHeight,
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
            }}
            onClick={() => _onSubmit(amount, toCategoryId)}
          >
            Transfer
          </Button>
        </View>
      </View>
    </Modal>
  );
}
