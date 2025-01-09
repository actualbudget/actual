import React from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { theme } from '../../style';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import {
  ModalCloseButton,
  Modal,
  ModalTitle,
  ModalHeader,
} from '../common/Modal';
import { View } from '../common/View';
import { SectionLabel } from '../forms';
import { useResponsive } from '../responsive/ResponsiveProvider';

type AccountAutocompleteModalProps = Extract<
  ModalType,
  { name: 'account-autocomplete' }
>['options'];

export function AccountAutocompleteModal({
  onSelect,
  includeClosedAccounts,
  onClose,
}: AccountAutocompleteModalProps) {
  const { t } = useTranslation();
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
                  title={t('Account')}
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
          <View>
            {!isNarrowWidth && (
              <SectionLabel
                title={t('Account')}
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
                onSelect={onSelect}
                includeClosedAccounts={includeClosedAccounts}
                value={null}
              />
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
