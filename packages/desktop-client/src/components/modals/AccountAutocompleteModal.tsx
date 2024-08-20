import React, { type ComponentPropsWithoutRef } from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '../common/Modal2';
import { View } from '../common/View';
import { SectionLabel } from '../forms';

type AccountAutocompleteModalProps = {
  autocompleteProps: ComponentPropsWithoutRef<typeof AccountAutocomplete>;
  onClose: () => void;
};

export function AccountAutocompleteModal({
  autocompleteProps,
  onClose,
}: AccountAutocompleteModalProps) {
  const { isNarrowWidth } = useResponsive();
  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  return (
    <Modal
      name="account-autocomplete"
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
                  title="Account"
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={
                <ModalCloseButton
                  onClick={close}
                  style={{ color: theme.menuAutoCompleteText }}
                />
              }
            />
          )}
          <View>
            {!isNarrowWidth && (
              <SectionLabel
                title="Account"
                style={{
                  alignSelf: 'center',
                  color: theme.menuAutoCompleteText,
                  marginBottom: 10,
                }}
              />
            )}
            <View style={{ flex: 1 }}>
              <AccountAutocomplete
                focused={true}
                embedded={true}
                closeOnBlur={false}
                onClose={close}
                {...defaultAutocompleteProps}
                {...autocompleteProps}
              />
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
