import React, { type ComponentPropsWithoutRef } from 'react';

import { useAccounts } from '../../hooks/useAccounts';
import { usePayees } from '../../hooks/usePayees';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import { ModalCloseButton, Modal, ModalTitle } from '../common/Modal';
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
      title={
        <ModalTitle
          title="Payee"
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
