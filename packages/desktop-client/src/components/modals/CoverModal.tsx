import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import type { IntegerAmount } from 'loot-core/shared/util';

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
import { useInitialMount } from '@desktop-client/hooks/useInitialMount';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import type { Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type CoverModalProps = Extract<ModalType, { name: 'cover' }>['options'];

export function CoverModal({
  title,
  amount: initialAmount,
  categoryId,
  month,
  showToBeBudgeted = true,
  onSubmit,
}: CoverModalProps) {
  const { t } = useTranslation();
  const [hideFraction] = useSyncedPref('hideFraction');

  const { data: { grouped: originalCategoryGroups } = { grouped: [] } } =
    useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const expenseGroups = originalCategoryGroups.filter(g => !g.is_income);
    const categoryGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(expenseGroups)
      : expenseGroups;
    const filteredCategoryGroups = categoryId
      ? removeCategoriesFromGroups(categoryGroups, categoryId)
      : categoryGroups;
    const filteredCategoryies = filteredCategoryGroups.flatMap(
      g => g.categories || [],
    );
    return [filteredCategoryGroups, filteredCategoryies];
  }, [categoryId, originalCategoryGroups, showToBeBudgeted]);

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const openCategoryModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            categoryGroups,
            month,
            onSelect: categoryId => {
              setFromCategoryId(categoryId);
            },
          },
        },
      }),
    );
  }, [categoryGroups, dispatch, month]);

  const fromCategory = categories.find(c => c.id === fromCategoryId);
  const [amount, setAmount] = useState<IntegerAmount>(
    Math.abs(initialAmount ?? 0),
  );

  const _onSubmit = () => {
    if (amount && fromCategoryId) {
      onSubmit(amount, fromCategoryId);
    }
  };

  const isInitialMount = useInitialMount();
  useEffect(() => {
    if (isInitialMount) {
      openCategoryModal();
    }
  }, [isInitialMount, openCategoryModal]);

  return (
    <Modal name="cover">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <FieldLabel title={t('Cover this amount:')} />
            <InitialFocus>
              <AmountInput
                value={amount}
                autoDecimals={String(hideFraction) !== 'true'}
                style={{
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
                inputStyle={{
                  height: styles.mobileMinHeight,
                }}
                onUpdate={setAmount}
                onEnter={() => {
                  if (!fromCategoryId) {
                    openCategoryModal();
                  }
                }}
              />
            </InitialFocus>
          </View>

          <View>
            <FieldLabel title={t('From:')} />
            <TapField value={fromCategory?.name} onPress={openCategoryModal} />
          </View>

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
                _onSubmit();
                close();
              }}
            >
              <Trans>Transfer</Trans>
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
