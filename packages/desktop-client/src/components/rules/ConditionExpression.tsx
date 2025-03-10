import React, { type CSSProperties } from 'react';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { mapField, friendlyOp } from 'loot-core/shared/rules';

import { Value } from './Value';

const valueStyle = {
  color: theme.pillTextHighlighted,
};

type ConditionExpressionProps = {
  field: unknown;
  op: unknown;
  value: unknown;
  options: unknown;
  prefix?: string;
  style?: CSSProperties;
  inline?: boolean;
};

export function ConditionExpression({
  field,
  op,
  value,
  options,
  prefix,
  style,
  inline,
}: ConditionExpressionProps) {
  return (
    <View
      style={{
        display: 'block',
        maxWidth: '100%',
        color: theme.pillText,
        backgroundColor: theme.pillBackgroundLight,
        borderRadius: 4,
        padding: '3px 5px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style,
      }}
    >
      {prefix && <Text>{prefix} </Text>}
      <Text style={valueStyle}>{mapField(field, options)}</Text>{' '}
      <Text>{friendlyOp(op)}</Text>{' '}
      {!['onbudget', 'offbudget'].includes(
        (op as string)?.toLocaleLowerCase(),
      ) && (
        <Value style={valueStyle} value={value} field={field} inline={inline} />
      )}
    </View>
  );
}
