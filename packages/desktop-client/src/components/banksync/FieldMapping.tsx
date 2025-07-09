import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgRightArrow2 } from '@actual-app/components/icons/v0';
import { SvgEquals } from '@actual-app/components/icons/v1';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import {
  type MappableFieldWithExample,
  type TransactionDirection,
} from './EditSyncAccount';

import { Row, Cell, TableHeader } from '@desktop-client/components/table';

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

type FieldMappingProps = {
  transactionDirection: TransactionDirection;
  setTransactionDirection: (newValue: TransactionDirection) => void;
  fields: MappableFieldWithExample[];
  mapping: Map<string, string>;
  setMapping: (field: string, value: string) => void;
};

export function FieldMapping({
  transactionDirection,
  setTransactionDirection,
  fields,
  mapping,
  setMapping,
}: FieldMappingProps) {
  const { t } = useTranslation();

  const { transactionDirectionOptions } = useTransactionDirectionOptions();

  return (
    <>
      <Select
        aria-label={t('Transaction direction')}
        options={transactionDirectionOptions.map(x => [x.value, x.label])}
        value={transactionDirection}
        onChange={newValue =>
          setTransactionDirection(newValue as TransactionDirection)
        }
        style={{
          width: '25%',
          margin: '1em 0',
        }}
      />

      {fields.length === 0 ? (
        <Text style={{ margin: '1em 0 .5em 0' }}>
          <Trans>
            No transactions found with mappable fields, accounts must have been
            synced at least once for this function to be available.
          </Trans>
        </Text>
      ) : (
        <>
          <TableHeader>
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
                  aria-label={t('Synced field to map to {{field}}', {
                    field: field.actualField,
                  })}
                  options={field.syncFields.map(({ field }) => [field, field])}
                  value={mapping.get(field.actualField)}
                  style={{
                    width: 290,
                  }}
                  onChange={newValue => {
                    if (newValue) setMapping(field.actualField, newValue);
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
        </>
      )}
    </>
  );
}
