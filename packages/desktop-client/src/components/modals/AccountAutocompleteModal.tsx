import React, { type ComponentPropsWithoutRef } from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { type CommonModalProps } from '../Modals';

type AccountAutocompleteModalProps = {
  modalProps: CommonModalProps;
  autocompleteProps: ComponentPropsWithoutRef<typeof AccountAutocomplete>;
  onClose: () => void;
};

export function AccountAutocompleteModal({
  modalProps,
  autocompleteProps,
  onClose,
}: AccountAutocompleteModalProps) {
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
      title="Account"
      noAnimation={!isNarrowWidth}
      showHeader={isNarrowWidth}
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      padding={0}
      style={{
        flex: 0,
        height: isNarrowWidth ? '85vh' : 275,
        padding: '15px 10px',
        borderRadius: '6px',
        ...(!isNarrowWidth && {
          backgroundColor: theme.mobileModalBackground,
          color: theme.mobileModalText,
        }),
      }}
    >
      {() => (
        <View>
          {!isNarrowWidth && (
            <SectionLabel
              title="Account"
              style={{
                alignSelf: 'center',
                color: theme.mobileModalText,
                marginBottom: 10,
              }}
            />
          )}
          <View style={{ flex: 1 }}>
            <AccountAutocomplete
              focused={true}
              embedded={true}
              closeOnBlur={false}
              onClose={_onClose}
              {...defaultAutocompleteProps}
              {...autocompleteProps}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
