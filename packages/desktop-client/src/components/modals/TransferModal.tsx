import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';

import { useCategories } from '../../hooks/useCategories';
import { styles } from '../../style';
import { addToBeBudgetedGroup } from '../budget/util';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { View } from '../common/View';
import { FieldLabel, TapField } from '../mobile/MobileForms';
import { AmountInput } from '../util/AmountInput';

type TransferModalProps = {
  title: string;
  month: string;
  amount: number;
  showToBeBudgeted: boolean;
  onSubmit: (amount: number, toCategoryId: string) => void;
};

export function TransferModal({
  title,
  month,
  amount: initialAmount,
  showToBeBudgeted,
  onSubmit,
}: TransferModalProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const filteredCategoryGroups = originalCategoryGroups.filter(
      g => !g.is_income,
    );
    const expenseGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(filteredCategoryGroups)
      : filteredCategoryGroups;
    const expenseCategories = expenseGroups.flatMap(g => g.categories || []);
    return [expenseGroups, expenseCategories];
  }, [originalCategoryGroups, showToBeBudgeted]);

  const [amount, setAmount] = useState<number>(0);
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

  const _onSubmit = (newAmount: number, categoryId: string | null) => {
    if (newAmount && categoryId) {
      onSubmit?.(newAmount, categoryId);
    }
  };

  const toCategory = categories.find(c => c.id === toCategoryId);

  return (
    <Modal name="transfer">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <View>
            <View>
              <FieldLabel title="Transfer this amount:" />
              <InitialFocus>
                <AmountInput
                  value={initialAmount}
                  autoDecimals={true}
                  style={{
                    marginLeft: styles.mobileEditingPadding,
                    marginRight: styles.mobileEditingPadding,
                  }}
                  inputStyle={{
                    height: styles.mobileMinHeight,
                  }}
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
                variant="primary"
                style={{
                  height: styles.mobileMinHeight,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                onPress={() => {
                  _onSubmit(amount, toCategoryId);
                  close();
                }}
              >
                Transfer
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
