import React, { type ComponentPropsWithoutRef } from 'react';

import { useAccounts } from '../../hooks/useAccounts';
import { useNavigate } from '../../hooks/useNavigate';
import { usePayees } from '../../hooks/usePayees';
import { useResponsive } from '../../ResponsiveProvider';
import { theme } from '../../style';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '../common/Modal2';
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
  const navigate = useNavigate();

  const _onClose = () => {
    modalProps.onClose();
    onClose?.();
  };

  const { isNarrowWidth } = useResponsive();
  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  const onManagePayees = () => navigate('/payees');

  return (
    <Modal
      header={
        isNarrowWidth &&
        (props => (
          <ModalHeader
            {...props}
            title={
              <ModalTitle
                title="Payee"
                getStyle={() => ({ color: theme.menuAutoCompleteText })}
              />
            }
            rightContent={props => (
              <ModalCloseButton
                {...props}
                style={{ color: theme.menuAutoCompleteText }}
              />
            )}
          />
        ))
      }
      noAnimation={!isNarrowWidth}
      {...modalProps}
      onClose={_onClose}
      style={{
        height: isNarrowWidth ? '85vh' : 275,
        backgroundColor: theme.menuAutoCompleteBackground,
      }}
    >
      {({ close }) => (
        <>
          {isNarrowWidth && (
            <ModalHeader
              title={
                <ModalTitle
                  title="Payee"
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
          <PayeeAutocomplete
            payees={payees}
            accounts={accounts}
            focused={true}
            embedded={true}
            closeOnBlur={false}
            onClose={close}
            onManagePayees={onManagePayees}
            showManagePayees={!isNarrowWidth}
            showMakeTransfer={!isNarrowWidth}
            {...defaultAutocompleteProps}
            {...autocompleteProps}
          />
        </>
      )}
    </Modal>
  );
}
