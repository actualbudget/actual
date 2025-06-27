import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '@desktop-client/components/budget/util';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import {
  FieldLabel,
  TapField,
} from '@desktop-client/components/mobile/MobileForms';
import { AmountInput } from '@desktop-client/components/util/AmountInput';
import { useCategories } from '@desktop-client/hooks/useCategories';
import {
  type Modal as ModalType,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type TransferModalProps = Extract<ModalType, { name: 'transfer' }>['options'];

export function TransferModal({
  title,
  categoryId,
  month,
  amount: initialAmount,
  showToBeBudgeted,
  onSubmit,
}: TransferModalProps) {
  const { t } = useTranslation();

  const { grouped: originalCategoryGroups } = useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;

    const filteredCategoryGroups = categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
    const filteredCategories = filteredCategoryGroups.flatMap(
      g => g.categories || [],
    );
    return [filteredCategoryGroups, filteredCategories];
  }, [categoryId, originalCategoryGroups, showToBeBudgeted]);

  const [amount, setAmount] = useState<number>(initialAmount);
  const [toCategoryId, setToCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const openCategoryModal = () => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            categoryGroups,
            month,
            showHiddenCategories: true,
            onSelect: categoryId => {
              setToCategoryId(categoryId);
            },
          },
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
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <View>
              <FieldLabel title={t('Transfer this amount:')} />
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
            <TapField value={toCategory?.name} onPress={openCategoryModal} />

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
                <Trans>Transfer</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
