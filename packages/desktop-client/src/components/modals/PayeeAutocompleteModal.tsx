import React from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { theme } from '@actual-app/components/theme';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { useAccounts } from '../../hooks/useAccounts';
import { useNavigate } from '../../hooks/useNavigate';
import { usePayees } from '../../hooks/usePayees';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '../common/Modal';

type PayeeAutocompleteModalProps = Extract<
  ModalType,
  { name: 'payee-autocomplete' }
>['options'];

export function PayeeAutocompleteModal({
  onSelect,
  onClose,
}: PayeeAutocompleteModalProps) {
  const { t } = useTranslation();
  const payees = usePayees() || [];
  const accounts = useAccounts() || [];
  const navigate = useNavigate();

  const { isNarrowWidth } = useResponsive();
  const defaultAutocompleteProps = {
    containerProps: { style: { height: isNarrowWidth ? '90vh' : 275 } },
  };

  const onManagePayees = () => navigate('/payees');

  return (
    <Modal
      name="payee-autocomplete"
      noAnimation={!isNarrowWidth}
      onClose={onClose}
      containerProps={{
        style: {
          height: isNarrowWidth ? '85dvh' : 275,
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
                  title={t('Payee')}
                  getStyle={() => ({ color: theme.menuAutoCompleteText })}
                />
              }
              rightContent={
                <ModalCloseButton
                  onPress={close}
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
            onSelect={onSelect}
            value={null}
          />
        </>
      )}
    </Modal>
  );
}
