import React, { useCallback, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';
import {
  type CategoryGroupEntity,
  type CategoryEntity,
} from 'loot-core/src/types/models';

import { useCategories } from '../../hooks/useCategories';
import { styles } from '../../style';
import { addToBeBudgetedGroup } from '../budget/util';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel, TapField } from '../mobile/MobileForms';

function removeSelectedCategory(
  categoryGroups: CategoryGroupEntity[],
  category?: CategoryEntity['id'],
) {
  if (!category) return categoryGroups;

  return categoryGroups
    .map(group => ({
      ...group,
      categories: group.categories?.filter(cat => cat.id !== category),
    }))
    .filter(group => group.categories?.length);
}

type CoverModalProps = {
  title: string;
  month: string;
  showToBeBudgeted?: boolean;
  category?: CategoryEntity['id'];
  onSubmit: (categoryId: string) => void;
};

export function CoverModal({
  title,
  month,
  showToBeBudgeted = true,
  category,
  onSubmit,
}: CoverModalProps) {
  const { t } = useTranslation();

  const { grouped: originalCategoryGroups } = useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const filteredCategoryGroups = originalCategoryGroups.filter(
      g => !g.is_income,
    );

    const expenseGroups = showToBeBudgeted
      ? addToBeBudgetedGroup(filteredCategoryGroups, t)
      : filteredCategoryGroups;

    const expenseCategories = expenseGroups.flatMap(g => g.categories || []);
    return [expenseGroups, expenseCategories];
  }, [originalCategoryGroups, showToBeBudgeted, t]);

  const filteredCategoryGroups = useMemo(
    () => removeSelectedCategory(categoryGroups, category),
    [categoryGroups, category],
  );

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const onCategoryClick = useCallback(() => {
    dispatch(
      pushModal('category-autocomplete', {
        categoryGroups: filteredCategoryGroups,
        month,
        onSelect: categoryId => {
          setFromCategoryId(categoryId);
        },
      }),
    );
  }, [filteredCategoryGroups, dispatch, month]);

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
            <FieldLabel title={t('Cover from category:')} />
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
