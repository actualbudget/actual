import React from 'react';

import { createPayee } from 'loot-core/client/actions';

import { useAccounts } from '../../hooks/useAccounts';
import { usePayees } from '../../hooks/usePayees';
import { useResponsive } from '../../ResponsiveProvider';
import { styles, theme } from '../../style';
import { ItemHeader } from '../autocomplete/ItemHeader';
import {
  PayeeAutocomplete,
  type PayeeAutocompleteProps,
  PayeeItem,
  CreatePayeeButton,
} from '../autocomplete/PayeeAutocomplete';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type PayeeAutocompleteModalProps = Partial<PayeeAutocompleteProps> & {
  modalProps: CommonModalProps;
  onClose: () => void;
};

export function PayeeAutocompleteModal({
  modalProps,
  onSelect,
  onClose,
}: PayeeAutocompleteModalProps) {
  const payees = usePayees() || [];
  const accounts = useAccounts() || [];

  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  function _onSelect(payeeId: string) {
    onSelect?.(payeeId);
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
      title="Payee"
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
        <PayeeAutocomplete
          payees={payees}
          accounts={accounts}
          value={null}
          focused={true}
          embedded={true}
          closeOnBlur={false}
          showManagePayees={false}
          showMakeTransfer={!isNarrowWidth}
          onSelect={async value => {
            if (value && value.startsWith('new:')) {
              value = await createPayee(value.slice('new:'.length));
            }

            _onSelect?.(value);
          }}
          isCreatable
          {...(isNarrowWidth && {
            renderCreatePayeeButton: props => (
              <CreatePayeeButton
                {...props}
                Icon={CreatePayeeIcon}
                style={itemStyle}
              />
            ),
            renderPayeeItemGroupHeader: props => (
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
            renderPayeeItem: props => (
              <PayeeItem
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
        />
      )}
    </Modal>
  );
}
