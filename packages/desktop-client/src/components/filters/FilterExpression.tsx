import React, { useState } from 'react';

import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { integerToCurrency } from 'loot-core/src/shared/util';

import { SvgDelete } from '../../icons/v0';
import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Value } from '../rules/Value';

import { FilterEditor } from './FilterEditor';
import { subfieldFromFilter } from './subfieldFromFilter';

type FilterExpressionProps = {
  field: string;
  customName: string;
  op: string;
  value: string | number;
  options: Array<[number, string]>;
  style?: CSSProperties;
  onChange: (newFilter) => void;
  onDelete: () => void;
};

export function FilterExpression({
  field: originalField,
  customName,
  op,
  value,
  options,
  style,
  onChange,
  onDelete,
}: FilterExpressionProps) {
  const [editing, setEditing] = useState(false);

  const field = subfieldFromFilter({ field: originalField, value });

  return (
    <View
      style={{
        backgroundColor: theme.pillBackground,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        marginTop: 10,
        ...style,
      }}
    >
      <Button
        type="bare"
        disabled={customName != null}
        onClick={() => setEditing(true)}
        style={{ marginRight: -7 }}
      >
        <div style={{ paddingBlock: 1, paddingLeft: 5, paddingRight: 2 }}>
          {customName ? (
            <Text style={{ color: theme.pageTextPositive }}>{customName}</Text>
          ) : (
            <>
              <Text style={{ color: theme.pageTextPositive }}>
                {mapField(field, options)}
              </Text>{' '}
              <Text>{friendlyOp(op, null)}</Text>{' '}
              <Value
                value={value}
                field={field}
                inline={true}
                valueIsRaw={op === 'contains' || op === 'doesNotContain'}
              />
            </>
          )}
        </div>
      </Button>
      <Button type="bare" onClick={onDelete} aria-label="Delete filter">
        <SvgDelete
          style={{
            width: 8,
            height: 8,
            margin: 5,
            marginLeft: 3,
          }}
        />
      </Button>
      {editing && (
        <FilterEditor
          field={originalField}
          op={op}
          value={
            field === 'amount' && typeof value === 'number'
              ? integerToCurrency(value)
              : value
          }
          options={options}
          onSave={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </View>
  );
}
