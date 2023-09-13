import React from 'react';

import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import { type ScheduleEntity } from 'loot-core/src/types/models';

import { type CSSProperties, theme } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

import ScheduleValue from './ScheduleValue';
import Value from './Value';

let valueStyle = {
  color: theme.pageTextPositive,
};

type ActionExpressionProps = {
  field: unknown;
  op: unknown;
  value: unknown;
  options: unknown;
  style?: CSSProperties;
};

export default function ActionExpression({
  field,
  op,
  value,
  options,
  style,
}: ActionExpressionProps) {
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
      {op === 'set' ? (
        <>
          <Text>{friendlyOp(op)}</Text>{' '}
          <Text style={valueStyle}>{mapField(field, options)}</Text>{' '}
          <Text>to </Text>
          <Value value={value} field={field} />
        </>
      ) : op === 'link-schedule' ? (
        <>
          <Text>{friendlyOp(op)}</Text>{' '}
          <ScheduleValue value={value as ScheduleEntity} />
        </>
      ) : null}
    </View>
  );
}
