import React from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { useResponsive } from '../responsive/ResponsiveProvider';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type CategoryAutocompleteModalProps = Extract<
  ModalType,
  { name: 'category-autocomplete' }
>['options'];

export function CategoryAutocompleteModal({
  month,
  onSelect,
  categoryGroups,
  showHiddenCategories,
  onClose,
}: CategoryAutocompleteModalProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();

  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      name="category-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth ? '85vh' : 275,
          backgroundColor: theme.menuAutoCompleteBackground,
        },
      }}
    >
      {({ state: { close } }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title={t('Category')}
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={
                <ModalCloseButton
                  onPress={close}
                  style={{ color: theme.menuAutoCompleteText }}
                />
              }
            />
          )}
          <View>
            {!isNarrowWidth && (
              <SectionLabel
                title={t('Category')}
                style={{
                  alignSelf: 'center',
                  color: theme.menuAutoCompleteText,
                  marginBottom: 10,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <NamespaceContext.Provider
                value={month ? monthUtils.sheetForMonth(month) : ''}
              >
                <CategoryAutocomplete
                  focused={true}
                  embedded={true}
                  closeOnBlur={false}
                  showSplitOption={false}
                  onClose={close}
                  {...defaultAutocompleteProps}
                  onSelect={onSelect}
                  categoryGroups={categoryGroups}
                  showHiddenCategories={showHiddenCategories}
                  value={null}
                />
              </NamespaceContext.Provider>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
