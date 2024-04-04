import React, { type ComponentPropsWithoutRef } from 'react';

import { useAccounts } from '../../hooks/useAccounts';
import { usePayees } from '../../hooks/usePayees';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type PayeeAutocompleteModalProps = {
  modalProps: CommonModalProps;
  autocompleteProps: ComponentPropsWithoutRef<typeof PayeeAutocomplete>;
  onClose: () => void;
};

export function PayeeAutocompleteModal({
  modalProps,
  autocompleteProps,
  onClose,
}: PayeeAutocompleteModalProps) {
  const payees = usePayees() || [];
  const accounts = useAccounts() || [];

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
          focused={true}
          embedded={true}
          closeOnBlur={false}
          onClose={_onClose}
          showManagePayees={false}
          showMakeTransfer={!isNarrowWidth}
          {...defaultAutocompleteProps}
          {...autocompleteProps}
        />
      )}
    </Modal>
  );
}
