import React from 'react';
import { useTranslation } from 'react-i18next';

import { Stack } from '@actual-app/components/stack';
import { View } from '@actual-app/components/view';

import { SelectField } from './SelectField';
import { SubLabel } from './SubLabel';
import {
  stripCsvImportTransaction,
  type FieldMapping,
  type ImportTransaction,
} from './utils';

import { SectionLabel } from '@desktop-client/components/forms';

type FieldMappingsProps = {
  transactions: ImportTransaction[];
  mappings?: FieldMapping;
  onChange: (field: keyof FieldMapping, newValue: string) => void;
  splitMode: boolean;
  inOutMode: boolean;
  hasHeaderRow: boolean;
};

export function FieldMappings({
  transactions,
  mappings = {
    date: null,
    amount: null,
    payee: null,
    notes: null,
    inOut: null,
    category: null,
    outflow: null,
    inflow: null,
  },
  onChange,
  splitMode,
  inOutMode,
  hasHeaderRow,
}: FieldMappingsProps) {
  const { t } = useTranslation();
  if (transactions.length === 0) {
    return null;
  }

  const trans = stripCsvImportTransaction(transactions[0]);
  const options = Object.keys(trans);

  return (
    <View>
      <SectionLabel title={t('CSV FIELDS')} />
      <Stack
        direction="row"
        align="flex-start"
        spacing={1}
        style={{ marginTop: 5 }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title={t('Date')} />
          <SelectField
            options={options}
            value={mappings.date}
            onChange={name => onChange('date', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title={t('Payee')} />
          <SelectField
            options={options}
            value={mappings.payee}
            onChange={name => onChange('payee', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title={t('Notes')} />
          <SelectField
            options={options}
            value={mappings.notes}
            onChange={name => onChange('notes', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title={t('Category')} />
          <SelectField
            options={options}
            value={mappings.category}
            onChange={name => onChange('category', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        {splitMode && !inOutMode ? (
          <>
            <View style={{ flex: 0.5 }}>
              <SubLabel title={t('Outflow')} />
              <SelectField
                options={options}
                value={mappings.outflow}
                onChange={name => onChange('outflow', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
            <View style={{ flex: 0.5 }}>
              <SubLabel title={t('Inflow')} />
              <SelectField
                options={options}
                value={mappings.inflow}
                onChange={name => onChange('inflow', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
          </>
        ) : (
          <>
            {inOutMode && (
              <View style={{ flex: 1 }}>
                <SubLabel title={t('In/Out')} />
                <SelectField
                  options={options}
                  value={mappings.inOut}
                  onChange={name => onChange('inOut', name)}
                  hasHeaderRow={hasHeaderRow}
                  firstTransaction={transactions[0]}
                />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <SubLabel title={t('Amount')} />
              <SelectField
                options={options}
                value={mappings.amount}
                onChange={name => onChange('amount', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
          </>
        )}
      </Stack>
    </View>
  );
}
