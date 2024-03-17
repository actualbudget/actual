import React from 'react';

import { useAccounts } from '../../hooks/useAccounts';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import {
  AccountAutocomplete,
  type AccountAutocompleteProps,
  AccountItem,
} from '../autocomplete/AccountAutocomplete';
import { ItemHeader } from '../autocomplete/ItemHeader';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { type CommonModalProps } from '../Modals';

type AccountAutocompleteModalProps = Partial<AccountAutocompleteProps> & {
  modalProps: CommonModalProps;
  onClose: () => void;
};

export function AccountAutocompleteModal({
  modalProps,
  onSelect,
  onClose,
  ...props
}: AccountAutocompleteModalProps) {
  const accounts = useAccounts() || [];

  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  function _onSelect(accountId: string, accountName: string) {
    onSelect?.(accountId, accountName);
    _onClose();
  }

  const itemStyle = {
    fontSize: 17,
    fontWeight: 400,
    paddingTop: 8,
    paddingBottom: 8,
  };

  const { isNarrowWidth } = useResponsive();
  const inputStyle = {
    ':focus': { boxShadow: 0 },
    ...(isNarrowWidth && itemStyle),
  };
  const autocompleteProps = {
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
              accounts={accounts}
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
              {...autocompleteProps}
              {...props}
            />
          </View>
        </View>
      )}
    </Modal>
  );
}
