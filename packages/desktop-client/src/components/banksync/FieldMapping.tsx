import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgRightArrow2 } from '@actual-app/components/icons/v0';
import { SvgEquals } from '@actual-app/components/icons/v1';
import { Select } from '@actual-app/components/select';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type {
  MappableFieldWithExample,
  TransactionDirection,
} from './EditSyncAccount';

import { Cell, Row, TableHeader } from '@desktop-client/components/table';

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
  isMobile?: boolean;
};

export function FieldMapping({
  transactionDirection,
  setTransactionDirection,
  fields,
  mapping,
  setMapping,
  isMobile = false,
}: FieldMappingProps) {
  const { t } = useTranslation();

  const { transactionDirectionOptions } = useTransactionDirectionOptions();

  const iconSpacing = isMobile ? 8 : 20;
  const iconPadding = isMobile ? 8 : 6;
  const arrowIconWidth = 15;
  const equalsIconWidth = 12;

  const calculatedSelectWidth = Math.max(
    ...fields.flatMap(field =>
      field.syncFields.map(({ field }) => field.length * 8 + 30),
    ),
  );

  const calculatedActualFieldWidth = isMobile
    ? Math.max(50, ...fields.map(field => field.actualField.length * 8 + 20))
    : Math.max(75, ...fields.map(field => field.actualField.length * 8 + 20));

  const arrowCellWidth = arrowIconWidth + iconSpacing + iconPadding;
  const equalsCellWidth = equalsIconWidth + iconSpacing + iconPadding;

  const commonCellStyle = { height: '100%', border: 0 };
  const iconCellStyle = { ...commonCellStyle };

  const selectStyle = {
    minWidth: isMobile ? '10ch' : '30ch',
    maxWidth: isMobile ? '15ch' : '50ch',
  };

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
          minWidth: '100px',
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
        <View style={styles.tableContainer}>
          <TableHeader>
            <Cell
              width={calculatedActualFieldWidth}
              style={{ paddingLeft: '10px' }}
              plain
            >
              <Text
                style={{ whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500 }}
              >
                {calculatedActualFieldWidth > 70 ? t('Actual field') : 'Actual'}
              </Text>
            </Cell>
            <Cell value="" width={arrowCellWidth} style={{ padding: 0 }} />
            <Cell
              value={t('Bank field')}
              width={calculatedSelectWidth}
              style={{ paddingLeft: 0, ...selectStyle }}
            />
            <Cell value="" width={equalsCellWidth} style={{ padding: 0 }} />
            <Cell
              value={t('Example')}
              width="flex"
              style={{ paddingLeft: 0 }}
            />
          </TableHeader>

          {fields.map(field => {
            return (
              <Row
                key={field.actualField}
                style={{
                  fontSize: 13,
                  backgroundColor: theme.tableBackground,
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '40px',
                  borderTop: '1px solid ' + theme.tableBorder,
                }}
                collapsed
              >
                <Cell
                  width={calculatedActualFieldWidth}
                  style={{ ...commonCellStyle, paddingLeft: '10px' }}
                  plain
                >
                  <Text style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                    {field.actualField}
                  </Text>
                </Cell>

                <Cell width={arrowCellWidth} style={iconCellStyle} plain>
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <SvgRightArrow2
                      style={{
                        width: arrowIconWidth,
                        height: 15,
                        color: theme.tableText,
                      }}
                    />
                  </View>
                </Cell>

                <Cell
                  width={calculatedSelectWidth}
                  style={{ ...iconCellStyle, ...selectStyle }}
                  plain
                >
                  <Select
                    aria-label={t('Synced field to map to {{field}}', {
                      field: field.actualField,
                    })}
                    options={field.syncFields.map(({ field }) => [
                      field,
                      field,
                    ])}
                    value={mapping.get(field.actualField)}
                    style={{
                      width: '100%',
                    }}
                    onChange={newValue => {
                      if (newValue) setMapping(field.actualField, newValue);
                    }}
                  />
                </Cell>

                <Cell width={equalsCellWidth} style={iconCellStyle} plain>
                  <View
                    style={{
                      flex: 1,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <SvgEquals
                      style={{
                        width: equalsIconWidth,
                        height: 12,
                        color: theme.tableText,
                      }}
                    />
                  </View>
                </Cell>

                <Cell
                  value={
                    field.syncFields.find(
                      f => f.field === mapping.get(field.actualField),
                    )?.example
                  }
                  width="flex"
                  style={{ ...commonCellStyle, paddingLeft: 0 }}
                />
              </Row>
            );
          })}
        </View>
      )}
    </>
  );
}
