import React from 'react';

import { mapField, friendlyOp } from 'loot-core/src/shared/rules';

import { type CSSProperties, theme } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

import Value from './Value';

let valueStyle = {
  color: theme.pageTextPositive,
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

export default function ConditionExpression({
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
        color: theme.altPillText,
        backgroundColor: theme.altPillBackground,
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
      <Value value={value} field={field} inline={inline} />
    </View>
  );
}
