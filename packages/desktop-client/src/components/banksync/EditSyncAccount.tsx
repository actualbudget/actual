import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { Stack } from '@actual-app/components/stack';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import {
  defaultMappings,
  type Mappings,
  mappingsFromString,
  mappingsToString,
} from 'loot-core/server/util/custom-sync-mapping';
import { q } from 'loot-core/shared/query';
import {
  type TransactionEntity,
  type AccountEntity,
} from 'loot-core/types/models';

import { FieldMapping } from './FieldMapping';

import { unlinkAccount } from '@desktop-client/accounts/accountsSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { CheckboxOption } from '@desktop-client/components/modals/ImportTransactionsModal/CheckboxOption';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useTransactions } from '@desktop-client/hooks/useTransactions';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

export type TransactionDirection = 'payment' | 'deposit';

type MappableActualFields = 'date' | 'payee' | 'notes';

export type MappableField = {
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

const getFields = (transaction: TransactionEntity) =>
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

  const [savedMappings = mappingsToString(defaultMappings), setSavedMappings] =
    useSyncedPref(`custom-sync-mappings-${account.id}`);
  const [savedImportNotes = true, setSavedImportNotes] = useSyncedPref(
    `sync-import-notes-${account.id}`,
  );
  const [savedImportPending = true, setSavedImportPending] = useSyncedPref(
    `sync-import-pending-${account.id}`,
  );
  const [savedReimportDeleted = true, setSavedReimportDeleted] = useSyncedPref(
    `sync-reimport-deleted-${account.id}`,
  );

  const [transactionDirection, setTransactionDirection] =
    useState<TransactionDirection>('payment');
  const [importPending, setImportPending] = useState(
    String(savedImportPending) === 'true',
  );
  const [importNotes, setImportNotes] = useState(
    String(savedImportNotes) === 'true',
  );
  const [reimportDeleted, setReimportDeleted] = useState(
    String(savedReimportDeleted) === 'true',
  );
  const [mappings, setMappings] = useState<Mappings>(
    mappingsFromString(savedMappings),
  );

  const transactionQuery = useMemo(
    () =>
      q('transactions')
        .filter({
          account: account.id,
          amount: transactionDirection === 'payment' ? { $lte: 0 } : { $gt: 0 },
          raw_synced_data: { $ne: null },
        })
        .options({ splits: 'none' })
        .select('*'),
    [account.id, transactionDirection],
  );

  const { transactions } = useTransactions({
    query: transactionQuery,
  });

  const exampleTransaction = useMemo(() => {
    const data = transactions?.[0]?.raw_synced_data;
    if (!data) return undefined;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to parse transaction data:', error);
      return undefined;
    }
  }, [transactions]);

  const onSave = async (close: () => void) => {
    const mappingsStr = mappingsToString(mappings);
    setSavedMappings(mappingsStr);
    setSavedImportPending(String(importPending));
    setSavedImportNotes(String(importNotes));
    setSavedReimportDeleted(String(reimportDeleted));
    close();
  };

  const dispatch = useDispatch();

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

  const setMapping = (field: string, value: string) => {
    setMappings(prev => {
      const updated = new Map(prev);
      updated?.get(transactionDirection)?.set(field, value);
      return updated;
    });
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

          <CheckboxOption
            id="form_pending"
            checked={importPending}
            onChange={() => setImportPending(!importPending)}
          >
            <Trans>Import pending transactions</Trans>
          </CheckboxOption>

          <CheckboxOption
            id="form_notes"
            checked={importNotes}
            onChange={() => setImportNotes(!importNotes)}
          >
            <Trans>Import transaction notes</Trans>
          </CheckboxOption>

          <CheckboxOption
            id="form_reimport_deleted"
            checked={reimportDeleted}
            onChange={() => setReimportDeleted(!reimportDeleted)}
          >
            <Tooltip
              content={t(
                'By default imported transactions that you delete will be re-imported with the next bank sync operation. To disable this behaviour - untick this box.',
              )}
            >
              <View
                style={{
                  display: 'flex',
                  flexWrap: 'nowrap',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Trans>Reimport deleted transactions</Trans>
                <SvgQuestion height={12} width={12} cursor="pointer" />
              </View>
            </Tooltip>
          </CheckboxOption>

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
