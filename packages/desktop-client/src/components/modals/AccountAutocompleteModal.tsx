import React, { type ComponentPropsWithoutRef } from 'react';

import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import {
  AccountAutocomplete,
  AccountItem,
} from '../autocomplete/AccountAutocomplete';
import { ItemHeader } from '../autocomplete/ItemHeader';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { type CommonModalProps } from '../Modals';

type AccountAutocompleteModalProps = {
  modalProps: CommonModalProps;
  autocompleteProps?: ComponentPropsWithoutRef<typeof AccountAutocomplete>;
  onClose: () => void;
};

export function AccountAutocompleteModal({
  modalProps,
  autocompleteProps,
  onClose,
}: AccountAutocompleteModalProps) {
  const { onSelect, ...restAutocompleteProps } = autocompleteProps;

  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  const _onSelect = (accountId, accountName) => {
    onSelect?.(accountId, accountName);
    _onClose();
  };

  const itemStyle = {
    ...styles.mobileMenuItem,
  };

  const { isNarrowWidth } = useResponsive();
  const inputStyle = {
    ':focus': { boxShadow: 0 },
    ...(isNarrowWidth && itemStyle),
  };
  const defaultAutocompleteProps = {
    inputProps: { style: inputStyle },
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
              value={null}
              focused={true}
              embedded={true}
              closeOnBlur={false}
              onSelect={_onSelect}
              {...(isNarrowWidth && {
                renderAccountItemGroupHeader: props => (
                  <ItemHeader
                    {...props}
                    style={{
                      ...styles.largeText,
                      color: theme.menuItemTextHeader,
                      paddingTop: 10,
                      paddingBottom: 10,
                    }}
                  />
                ),
                renderAccountItem: props => (
                  <AccountItem
                    {...props}
                    style={{
                      ...itemStyle,
                      color: theme.menuItemText,
                      borderRadius: 0,
                      borderTop: `1px solid ${theme.pillBorder}`,
                    }}
                  />
                ),
              })}
              {...defaultAutocompleteProps}
              {...restAutocompleteProps}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
