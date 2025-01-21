import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import {
  type Modal as ModalType,
  pushModal,
} from 'loot-core/client/modals/modalsSlice';

import { useCategories } from '../../hooks/useCategories';
import { useDispatch } from '../../redux';
import { styles } from '../../style';
import {
  addToBeBudgetedGroup,
  removeCategoriesFromGroups,
} from '../budget/util';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel, TapField } from '../mobile/MobileForms';

type CoverModalProps = Extract<ModalType, { name: 'cover' }>['options'];

export function CoverModal({
  title,
  categoryId,
  month,
  showToBeBudgeted = true,
  onSubmit,
}: CoverModalProps) {
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
    const filteredCategoryies = filteredCategoryGroups.flatMap(
      g => g.categories || [],
    );
    return [filteredCategoryGroups, filteredCategoryies];
  }, [categoryId, originalCategoryGroups, showToBeBudgeted]);

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const onCategoryClick = useCallback(() => {
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

  const _onSubmit = (categoryId: string | null) => {
    if (categoryId) {
      onSubmit?.(categoryId);
    }
  };

  const fromCategory = categories.find(c => c.id === fromCategoryId);

  return (
    <Modal name="cover">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={title}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View>
            <FieldLabel title={t('Cover from a category:')} />
            <TapField value={fromCategory?.name} onClick={onCategoryClick} />
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
                _onSubmit(fromCategoryId);
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
