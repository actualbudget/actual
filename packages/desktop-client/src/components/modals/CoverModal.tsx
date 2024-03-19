import React, { useCallback, useEffect, useState } from 'react';
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
  onSubmit: (categoryId: string) => void;
};

export function CoverModal({
  modalProps,
  categoryId,
  onSubmit,
}: CoverModalProps) {
  const { grouped: originalCategoryGroups, list: categories } = useCategories();
  const categoryGroups = addToBeBudgetedGroup(
    originalCategoryGroups.filter(g => !g.is_income),
  );

  const [fromCategoryId, setFromCategoryId] = useState<string | null>(null);
  const dispatch = useDispatch();

  const onCategoryClick = useCallback(() => {
    dispatch(
      pushModal('category-autocomplete', {
        categoryGroups,
        onSelect: categoryId => {
          setFromCategoryId(categoryId);
        },
      }),
    );
  }, [categoryGroups, dispatch]);

  const _onSubmit = (categoryId: string) => {
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

  const category = categories.find(c => c.id === categoryId);

  if (category == null) {
    return null;
  }

  return (
    <Modal
      title={`Cover ${category.name}`}
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
            <FieldLabel title="Cover from category:" />
            <TapField
              value={categories.find(c => c.id === fromCategoryId)?.name}
              onClick={onCategoryClick}
            />
          </View>

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
        </>
      )}
    </Modal>
  );
}
