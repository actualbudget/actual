import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  type TransactionEntity,
  type AccountEntity,
} from 'loot-core/types/models';

import { BankSyncCheckboxOptions } from './BankSyncCheckboxOptions';
import { FieldMapping } from './FieldMapping';
import { useBankSyncAccountSettings } from './useBankSyncAccountSettings';

import { unlinkAccount } from '@desktop-client/accounts/accountsSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export type TransactionDirection = 'payment' | 'deposit';

type MappableActualFields = 'date' | 'payee' | 'notes';

type MappableField = {
  actualField: MappableActualFields;
  syncFields: string[];
};
export type MappableFieldWithExample = {
  actualField: MappableActualFields;
  syncFields: {
    field: string;
    example: string;
  }[];
};

const mappableFields: MappableField[] = [
  {
    actualField: 'date',
    syncFields: [
      'date',
      'bookingDate',
      'valueDate',
      'postedDate',
      'transactedDate',
    ],
  },
  {
    actualField: 'payee',
    syncFields: [
      'payeeName',
      'creditorName',
      'debtorName',
      'remittanceInformationUnstructured',
      'remittanceInformationUnstructuredArrayString',
      'remittanceInformationStructured',
      'remittanceInformationStructuredArrayString',
      'additionalInformation',
      'paymentData.payer.accountNumber',
      'paymentData.payer.documentNumber.value',
      'paymentData.payer.name',
      'paymentData.receiver.accountNumber',
      'paymentData.receiver.documentNumber.value',
      'paymentData.receiver.name',
      'merchant.name',
      'merchant.businessName',
      'merchant.cnpj',
    ],
  },
  {
    actualField: 'notes',
    syncFields: [
      'notes',
      'remittanceInformationUnstructured',
      'remittanceInformationUnstructuredArrayString',
      'remittanceInformationStructured',
      'remittanceInformationStructuredArrayString',
      'additionalInformation',
      'category',
      'paymentData.payer.accountNumber',
      'paymentData.payer.documentNumber.value',
      'paymentData.payer.name',
      'paymentData.receiver.accountNumber',
      'paymentData.receiver.documentNumber.value',
      'paymentData.receiver.name',
      'merchant.name',
      'merchant.businessName',
      'merchant.cnpj',
    ],
  },
];

export const getFields = (transaction: TransactionEntity) =>
  mappableFields.map(field => ({
    actualField: field.actualField,
    syncFields: field.syncFields
      .filter(syncField => transaction[syncField as keyof TransactionEntity])
      .map(syncField => ({
        field: syncField,
        example: transaction[syncField as keyof TransactionEntity],
      })),
  }));

export type EditSyncAccountProps = {
  account: AccountEntity;
};

export function EditSyncAccount({ account }: EditSyncAccountProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const {
    transactionDirection,
    setTransactionDirection,
    importPending,
    setImportPending,
    importNotes,
    setImportNotes,
    reimportDeleted,
    setReimportDeleted,
    importTransactions,
    setImportTransactions,
    mappings,
    setMapping,
    exampleTransaction,
    saveSettings,
  } = useBankSyncAccountSettings(account.id);

  const onSave = async (close: () => void) => {
    saveSettings();
    close();
  };

  const onUnlink = async (close: () => void) => {
    dispatch(
      pushModal({
        modal: {
          name: 'confirm-unlink-account',
          options: {
            accountName: account.name,
            isViewBankSyncSettings: true,
            onUnlink: () => {
              dispatch(unlinkAccount({ id: account.id }));
              close();
            },
          },
        },
      }),
    );
  };

  const potentiallyTruncatedAccountName =
    account.name.length > 30 ? account.name.slice(0, 30) + '...' : account.name;

  const fields = exampleTransaction ? getFields(exampleTransaction) : [];
  const mapping = mappings.get(transactionDirection);

  return (
    <Modal
      name="synced-account-edit"
      containerProps={{ style: { width: 800 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('{{accountName}} bank sync settings', {
              accountName: potentiallyTruncatedAccountName,
            })}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <Text style={{ fontSize: 15 }}>
            <Trans>Field mapping</Trans>
          </Text>

          <FieldMapping
            transactionDirection={transactionDirection}
            setTransactionDirection={setTransactionDirection}
            fields={fields as MappableFieldWithExample[]}
            mapping={mapping!}
            setMapping={setMapping}
          />

          <Text style={{ fontSize: 15, margin: '1em 0 .5em 0' }}>
            <Trans>Options</Trans>
          </Text>

          <BankSyncCheckboxOptions
            importPending={importPending}
            setImportPending={setImportPending}
            importNotes={importNotes}
            setImportNotes={setImportNotes}
            reimportDeleted={reimportDeleted}
            setReimportDeleted={setReimportDeleted}
            importTransactions={importTransactions}
            setImportTransactions={setImportTransactions}
            helpMode="desktop"
          />

          <View
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 20,
            }}
          >
            <Button
              style={{ color: theme.errorText }}
              onPress={() => {
                onUnlink(close);
              }}
            >
              <Trans>Unlink account</Trans>
            </Button>

            <Stack direction="row">
              <Button style={{ marginRight: 10 }} onPress={close}>
                <Trans>Cancel</Trans>
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  onSave(close);
                }}
              >
                <Trans>Save</Trans>
              </Button>
            </Stack>
          </View>
        </>
      )}
    </Modal>
  );
}
