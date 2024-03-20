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
              focused={true}
              embedded={true}
              closeOnBlur={false}
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
              {...autocompleteProps}
              onSelect={(...args) => {
                const { type, onSelect } = autocompleteProps;

                if (type === 'multi') {
                  const ids: Parameters<typeof onSelect>[0] = args[0];
                  const value: Parameters<typeof onSelect>[1] = args[1];
                  autocompleteProps?.onSelect?.(ids, value);
                } else {
                  const id: Parameters<typeof onSelect>[0] = args[0];
                  const value: Parameters<typeof onSelect>[1] = args[1];
                  autocompleteProps?.onSelect?.(id, value);
                }
                _onClose();
              }}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
