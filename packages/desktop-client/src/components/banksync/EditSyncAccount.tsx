import React, { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

//import { useTransactions } from 'loot-core/client/data-hooks/transactions';
import { q } from 'loot-core/src/shared/query';
import {
  type TransactionEntity,
  type AccountEntity,
} from 'loot-core/src/types/models';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { SvgRightArrow2 } from '../../icons/v0';
import { SvgEquals } from '../../icons/v1';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Select } from '../common/Select';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { CheckboxOption } from '../modals/ImportTransactionsModal/CheckboxOption';
import { Row, Cell, TableHeader } from '../table';

type EditSyncAccountProps = {
  account: AccountEntity;
};

type Mappings = Map<string, Map<string, string>>;

const transactions = [
  {
    bookingDate: '2024-11-18',
    valueDate: '2024-11-19',
    amount: 12345,
    bookingDateTime: '2024-11-18T00:00:00+00:00',
    valueDateTime: '2024-11-19T00:00:00+00:00',
    debtorName: 'TESCO',
    remittanceInformationUnstructured: 'TESCO STORE XXX LOCATION',
    additionalInformation: 'ATXXXXXXXXXXXXXXXX',
    payeeName: 'Tesco',
    date: '2024-11-18',
  },
  {
    bookingDate: '2024-11-18',
    valueDate: '2024-11-19',
    amount: -12345,
    bookingDateTime: '2024-11-18T00:00:00+00:00',
    valueDateTime: '2024-11-19T00:00:00+00:00',
    creditorName: 'TESCO',
    remittanceInformationUnstructured: 'TESCO STORE XXX LOCATION',
    additionalInformation: 'ATXXXXXXXXXXXXXXXX',
    payeeName: 'Tesco',
    date: '2024-11-18',
  },
];

const mappableFields = [
  {
    actualField: 'date',
    syncFields: ['date', 'bookingDate', 'valueDate'],
  },
  {
    actualField: 'payee',
    syncFields: [
      'payeeName',
      'creditorName',
      'debtorName',
      'remittanceInformationUnstructured',
      'remittanceInformationStructured',
      'additionalInformation',
    ],
  },
  {
    actualField: 'notes',
    syncFields: [
      'remittanceInformationUnstructured',
      'remittanceInformationStructured',
      'additionalInformation',
    ],
  },
];

const useTransactionDirectionOptions = () => {
  const { t } = useTranslation();

  const transactionDirectionOptions = [
    {
      value: 'payment',
      label: t('Payment'),
    },
    {
      value: 'deposit',
      label: t('Deposit'),
    },
  ];

  return { transactionDirectionOptions };
};

const getFields = (transaction: TransactionEntity | object) =>
  mappableFields.map(field => ({
    actualField: field.actualField,
    syncFields: field.syncFields
      .filter(syncField => transaction[syncField])
      .map(syncField => ({
        field: syncField,
        example: transaction[syncField],
      })),
  }));

const mappingsToString = (mapping: Mappings): string =>
  JSON.stringify(
    Object.fromEntries(
      [...mapping.entries()].map(([key, value]) => [
        key,
        Object.fromEntries(value),
      ]),
    ),
  );

const mappingsFromString = (str: string): Mappings =>
  new Map(
    Object.entries(JSON.parse(str)).map(([key, value]) => [
      key,
      new Map(Object.entries(value)),
    ]),
  );

export function EditSyncAccount({ account }: EditSyncAccountProps) {
  const { t } = useTranslation();
  const { transactionDirectionOptions } = useTransactionDirectionOptions();

  const [
    savedMappings = mappingsToString(
      new Map([
        [
          'payment',
          new Map([
            ['date', 'date'],
            ['payee', 'creditorName'],
            ['notes', 'remittanceInformationUnstructured'],
          ]),
        ],
        [
          'deposit',
          new Map([
            ['date', 'date'],
            ['payee', 'debtorName'],
            ['notes', 'remittanceInformationUnstructured'],
          ]),
        ],
      ]),
    ),
    setSavedMappings,
  ] = useSyncedPref(`custom-sync-mappings-${account.id}`);
  const [savedImportNotes = true, setSavedImportNotes] = useSyncedPref(
    `sync-import-notes-${account.id}`,
  );
  const [savedImportPending = true, setSavedImportPending] = useSyncedPref(
    `sync-import-pending-${account.id}`,
  );

  const [transactionDirection, setTransactionDirection] = useState('payment');
  const [importPending, setImportPending] = useState(
    String(savedImportPending) === 'true',
  );
  const [importNotes, setImportNotes] = useState(
    String(savedImportNotes) === 'true',
  );
  const [mappings, setMappings] = useState<Mappings>(
    mappingsFromString(savedMappings),
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(({ amount }) =>
        transactionDirection === 'payment' ? amount <= 0 : amount > 0,
      ),
    [transactionDirection],
  );

  const _transactionQuery = useMemo(
    () =>
      q('transactions')
        .filter({
          account: account.id,
          amount: transactionDirection === 'payment' ? { $lte: 0 } : { $gt: 0 },
        })
        .limit(1)
        .select('*'),
    [account, transactionDirection],
  );

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
      updated.get(transactionDirection).set(field, value);
      return updated;
    });
  };

  // const { transactions: _transactions2, isLoading } = useTransactions({
  //   query: transactionQuery,
  // });

  //  if (isLoading) return null;

  const fields =
    filteredTransactions.length > 0 ? getFields(filteredTransactions[0]) : [];

  const mapping = mappings.get(transactionDirection);

  return (
    <Modal
      name="synced-account-edit"
      containerProps={{ style: { width: 800 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Edit synced account')}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <Text style={{ fontSize: 15 }}>Field mapping</Text>

          <Select
            options={transactionDirectionOptions.map(x => [x.value, x.label])}
            value={transactionDirection}
            onChange={newValue => setTransactionDirection(newValue)}
            style={{
              width: '25%',
              margin: '1em 0',
            }}
          />

          <TableHeader style={{}}>
            <Cell
              value={t('Actual field')}
              width={100}
              style={{ paddingLeft: '10px' }}
            />
            <Cell
              value={t('Bank field')}
              width={330}
              style={{ paddingLeft: '10px' }}
            />
            <Cell
              value={t('Example')}
              width="flex"
              style={{ paddingLeft: '10px' }}
            />
          </TableHeader>

          {fields.map(field => {
            return (
              <Row
                key={field.actualField}
                style={{
                  fontSize: 13,
                  backgroundColor: theme.tableRowBackgroundHover,
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid var(--color-tableBorder)',
                  minHeight: '40px',
                }}
                collapsed={true}
              >
                <Cell
                  value={field.actualField}
                  width={75}
                  style={{ paddingLeft: '10px', height: '100%', border: 0 }}
                />

                <Text>
                  <SvgRightArrow2
                    style={{
                      width: 15,
                      height: 15,
                      color: theme.tableText,
                      marginRight: '20px',
                    }}
                  />
                </Text>

                <Select
                  options={field.syncFields.map(({ field }) => [field, field])}
                  value={mapping.get(field.actualField)}
                  style={{
                    width: 290,
                  }}
                  onChange={newValue => {
                    setMapping(field.actualField, newValue);
                  }}
                />

                <Text>
                  <SvgEquals
                    style={{
                      width: 12,
                      height: 12,
                      color: theme.tableText,
                      marginLeft: '20px',
                    }}
                  />
                </Text>

                <Cell
                  value={
                    field.syncFields.find(
                      f => f.field === mapping.get(field.actualField),
                    )?.example
                  }
                  width="flex"
                  style={{ paddingLeft: '10px', height: '100%', border: 0 }}
                />
              </Row>
            );
          })}

          <Text style={{ fontSize: 15, margin: '1em 0 .5em 0' }}>Options</Text>

          <CheckboxOption
            id="form_pending"
            checked={importPending}
            onChange={() => setImportPending(!importPending)}
          >
            {t('Import pending transactions')}
          </CheckboxOption>

          <CheckboxOption
            id="form_notes"
            checked={importNotes}
            onChange={() => setImportNotes(!importNotes)}
          >
            {t('Import transaction notes')}
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
