import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { useTransactions } from 'loot-core/client/data-hooks/transactions';
import {
  defaultMappings,
  type Mappings,
  mappingsFromString,
  mappingsToString,
} from 'loot-core/server/util/custom-sync-mapping';
import { q } from 'loot-core/src/shared/query';
import {
  type TransactionEntity,
  type AccountEntity,
} from 'loot-core/src/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { CheckboxOption } from '../modals/ImportTransactionsModal/CheckboxOption';

import { FieldMapping } from './FieldMapping';

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

  const [transactionDirection, setTransactionDirection] =
    useState<TransactionDirection>('payment');
  const [importPending, setImportPending] = useState(
    String(savedImportPending) === 'true',
  );
  const [importNotes, setImportNotes] = useState(
    String(savedImportNotes) === 'true',
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
    close();
  };

  const setMapping = (field: string, value: string) => {
    setMappings(prev => {
      const updated = new Map(prev);
      updated?.get(transactionDirection)?.set(field, value);
      return updated;
    });
  };

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
            title={t('Account settings')}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <Text style={{ fontSize: 15 }}>
            <Trans>Field mapping</Trans>
          </Text>

          {fields.length > 0 ? (
            <FieldMapping
              transactionDirection={transactionDirection}
              setTransactionDirection={setTransactionDirection}
              fields={fields as MappableFieldWithExample[]}
              mapping={mapping!}
              setMapping={setMapping}
            />
          ) : (
            <Text style={{ margin: '1em 0 .5em 0' }}>
              <Trans>
                No transactions found with mappable fields, accounts must have
                been synced at least once for this function to be available.
              </Trans>
            </Text>
          )}

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

          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ marginTop: 20 }}
          >
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
        </>
      )}
    </Modal>
  );
}
