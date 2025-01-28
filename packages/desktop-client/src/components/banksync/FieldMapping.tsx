import React from 'react';
import { useTranslation } from 'react-i18next';

import { SvgRightArrow2 } from '../../icons/v0';
import { SvgEquals } from '../../icons/v1';
import { theme } from '../../style';
import { Select } from '../common/Select';
import { Text } from '../common/Text';
import { Row, Cell, TableHeader } from '../table';

import {
  type MappableFieldWithExample,
  type TransactionDirection,
} from './EditSyncAccount';

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
  );
}
