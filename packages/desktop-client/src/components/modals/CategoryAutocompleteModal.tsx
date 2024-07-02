import React, { type ComponentPropsWithoutRef } from 'react';

import * as monthUtils from 'loot-core/src/shared/months';

import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { ModalCloseButton, Modal, ModalTitle } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { type CommonModalProps } from '../Modals';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

type CategoryAutocompleteModalProps = {
  modalProps: CommonModalProps;
  autocompleteProps: ComponentPropsWithoutRef<typeof CategoryAutocomplete>;
  onClose: () => void;
  month?: string;
};

export function CategoryAutocompleteModal({
  modalProps,
  autocompleteProps,
  month,
  onClose,
}: CategoryAutocompleteModalProps) {
  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  const { isNarrowWidth } = useResponsive();

  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      title={
        <ModalTitle
          title="Category"
          getStyle={() => ({ color: theme.menuAutoCompleteText })}
        />
      }
      noAnimation={!isNarrowWidth}
      showHeader={isNarrowWidth}
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      style={{
        height: isNarrowWidth ? '85vh' : 275,
        backgroundColor: theme.menuAutoCompleteBackground,
      }}
      CloseButton={props => (
        <ModalCloseButton
          {...props}
          style={{ color: theme.menuAutoCompleteText }}
        />
      )}
    >
      {() => (
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
                onClose={_onClose}
                {...defaultAutocompleteProps}
                {...autocompleteProps}
              />
            </NamespaceContext.Provider>
          </View>
        </View>
      )}
    </Modal>
  );
}
