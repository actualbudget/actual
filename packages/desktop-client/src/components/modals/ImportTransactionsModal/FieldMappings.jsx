import React from 'react';

import { Stack } from '../../common/Stack';
import { View } from '../../common/View';
import { SectionLabel } from '../../forms';

import { SelectField } from './SelectField';
import { SubLabel } from './SubLabel';

export function FieldMappings({
  transactions,
  mappings,
  onChange,
  splitMode,
  inOutMode,
  hasHeaderRow,
}) {
  if (transactions.length === 0) {
    return null;
  }

  const { existing, ignored, selected, selected_merge, trx_id, ...trans } =
    transactions[0];
  const options = Object.keys(trans);
  mappings = mappings || {};

  return (
    <View>
      <SectionLabel title="CSV FIELDS" />
      <Stack
        direction="row"
        align="flex-start"
        spacing={1}
        style={{ marginTop: 5 }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title="Date" />
          <SelectField
            options={options}
            value={mappings.date}
            onChange={name => onChange('date', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title="Payee" />
          <SelectField
            options={options}
            value={mappings.payee}
            onChange={name => onChange('payee', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title="Notes" />
          <SelectField
            options={options}
            value={mappings.notes}
            onChange={name => onChange('notes', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        <View style={{ flex: 1, marginRight: 10 }}>
          <SubLabel title="Category" />
          <SelectField
            options={options}
            value={mappings.category}
            onChange={name => onChange('category', name)}
            hasHeaderRow={hasHeaderRow}
            firstTransaction={transactions[0]}
          />
        </View>
        {splitMode ? (
          <>
            <View style={{ flex: 0.5 }}>
              <SubLabel title="Outflow" />
              <SelectField
                options={options}
                value={mappings.outflow}
                onChange={name => onChange('outflow', name)}
                hasHeaderRow={hasHeaderRow}
                firstTransaction={transactions[0]}
              />
            </View>
            <View style={{ flex: 0.5 }}>
              <SubLabel title="Inflow" />
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
                <SubLabel title="In/Out" />
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
              <SubLabel title="Amount" />
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
