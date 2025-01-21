// @ts-strict-ignore
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { useCategories } from '../../hooks/useCategories';
import { theme } from '../../style';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { Block } from '../common/Block';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type ConfirmCategoryDeleteModalProps = Extract<
  ModalType,
  { name: 'confirm-category-delete' }
>['options'];

export function ConfirmCategoryDeleteModal({
  group: groupId,
  category: categoryId,
  onDelete,
}: ConfirmCategoryDeleteModalProps) {
  const { t } = useTranslation(); // Initialize translation hook
  const [transferCategory, setTransferCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { grouped: categoryGroups, list: categories } = useCategories();
  const group = categoryGroups.find(g => g.id === groupId);
  const category = categories.find(c => c.id === categoryId);

  const renderError = (error: string) => {
    let msg: string;

    switch (error) {
      case 'required-transfer':
        msg = 'You must select a category';
        break;
      default:
        msg = 'Something bad happened, sorry!';
    }

    return (
      <Text
        style={{
          marginTop: 15,
          color: theme.errorText,
        }}
      >
        {msg}
      </Text>
    );
  };

  const isIncome = !!(category || group).is_income;

  return (
    <Modal
      name="confirm-category-delete"
      containerProps={{ style: { width: '30vw' } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Confirm Delete')} // Use translation for title
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ lineHeight: 1.5 }}>
            {group ? (
              <Block>
                Categories in the group <strong>{group.name}</strong> are used
                by existing transactions
                {!isIncome &&
                  ' or it has a positive leftover balance currently'}
                . <strong>Are you sure you want to delete it?</strong> If so,
                you must select another category to transfer existing
                transactions and balance to.
              </Block>
            ) : (
              <Block>
                <strong>{category.name}</strong> is used by existing
                transactions
                {!isIncome &&
                  ' or it has a positive leftover balance currently'}
                . <strong>Are you sure you want to delete it?</strong> If so,
                you must select another category to transfer existing
                transactions and balance to.
              </Block>
            )}

            {error && renderError(error)}

            <View
              style={{
                marginTop: 20,
                flexDirection: 'row',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <Text>{t('Transfer to:')}</Text>

              <View style={{ flex: 1, marginLeft: 10, marginRight: 30 }}>
                <CategoryAutocomplete
                  categoryGroups={
                    group
                      ? categoryGroups.filter(
                          g => g.id !== group.id && !!g.is_income === isIncome,
                        )
                      : categoryGroups
                          .filter(g => !!g.is_income === isIncome)
                          .map(g => ({
                            ...g,
                            categories: g.categories.filter(
                              c => c.id !== category.id,
                            ),
                          }))
                  }
                  value={transferCategory}
                  focused={true}
                  inputProps={{
                    placeholder: t('Select category...'),
                  }}
                  onSelect={category => setTransferCategory(category)}
                  showHiddenCategories={true}
                />
              </View>

              <Button
                variant="primary"
                onPress={() => {
                  if (!transferCategory) {
                    setError('required-transfer');
                  } else {
                    onDelete(transferCategory);
                    close();
                  }
                }}
              >
                {t('Delete')}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
