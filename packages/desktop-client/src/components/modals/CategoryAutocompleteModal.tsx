import React, { type ComponentPropsWithoutRef } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useResponsive } from '../../ResponsiveProvider';
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
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'category-autocomplete' as const;

type CategoryAutocompleteModalProps = {
  name: typeof MODAL_NAME;
  autocompleteProps: ComponentPropsWithoutRef<typeof CategoryAutocomplete>;
  onClose?: () => void;
  month?: string;
};

export function CategoryAutocompleteModal({
  name = MODAL_NAME,
  autocompleteProps,
  month,
  onClose,
}: CategoryAutocompleteModalProps) {
  const { isNarrowWidth } = useResponsive();

  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      name={name}
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
                  title="Category"
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
                title="Category"
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
                  {...autocompleteProps}
                />
              </NamespaceContext.Provider>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
CategoryAutocompleteModal.modalName = MODAL_NAME;
