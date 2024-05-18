import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

import { pushModal } from 'loot-core/client/actions';

import { useCategories } from '../../hooks/useCategories';
import { useInitialMount } from '../../hooks/useInitialMount';
import { styles } from '../../style';
import { addToBeBudgetedGroup } from '../budget/util';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FieldLabel, TapField } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';

type CoverModalProps = {
  modalProps: CommonModalProps;
  categoryId: string;
  month: string;
  onSubmit: (categoryId: string) => void;
};

export function CoverModal({
  modalProps,
  categoryId,
  month,
  onSubmit,
}: CoverModalProps) {
  const { grouped: originalCategoryGroups } = useCategories();
  const [categoryGroups, categories] = useMemo(() => {
    const expenseGroups = addToBeBudgetedGroup(
      originalCategoryGroups.filter(g => !g.is_income),
    );
    const expenseCategories = expenseGroups.flatMap(g => g.categories || []);
    return [expenseGroups, expenseCategories];
  }, [originalCategoryGroups]);

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const onCategoryClick = useCallback(() => {
    dispatch(
      pushModal('category-autocomplete', {
        categoryGroups,
        month,
        onSelect: categoryId => {
          setFromCategoryId(categoryId);
        },
      }),
    );
  }, [categoryGroups, dispatch, month]);

  const _onSubmit = (categoryId: string | null) => {
    if (categoryId) {
      onSubmit?.(categoryId);
    }

    modalProps.onClose();
  };

  const initialMount = useInitialMount();

  useEffect(() => {
    if (initialMount) {
      onCategoryClick();
    }
  }, [initialMount, onCategoryClick]);

  const fromCategory = categories.find(c => c.id === fromCategoryId);
  const category = categories.find(c => c.id === categoryId);

  if (!category) {
    return null;
  }

  return (
    <Modal
      title={category.name}
      showHeader
      focusAfterClose={false}
      {...modalProps}
    >
      <View>
        <FieldLabel title="Cover from category:" />
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
          type="primary"
          style={{
            height: styles.mobileMinHeight,
            marginLeft: styles.mobileEditingPadding,
            marginRight: styles.mobileEditingPadding,
          }}
          onClick={() => _onSubmit(fromCategoryId)}
        >
          Transfer
        </Button>
      </View>
    </Modal>
  );
}
