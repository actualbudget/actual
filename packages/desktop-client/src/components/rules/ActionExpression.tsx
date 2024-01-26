import React from 'react';

import { mapField, friendlyOp } from 'loot-core/src/shared/rules';
import {
  type LinkScheduleRuleActionEntity,
  type RuleActionEntity,
  type SetRuleActionEntity,
} from 'loot-core/src/types/models';

import { type CSSProperties, theme } from '../../style';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { ScheduleValue } from './ScheduleValue';
import { Value } from './Value';

const valueStyle = {
  color: theme.pillTextHighlighted,
};

type ActionExpressionProps = RuleActionEntity & {
  style?: CSSProperties;
};

export function ActionExpression({ style, ...props }: ActionExpressionProps) {
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
      {props.op === 'set' ? (
        <SetActionExpression {...props} />
      ) : props.op === 'link-schedule' ? (
        <LinkScheduleActionExpression {...props} />
      ) : null}
    </View>
  );
}

function SetActionExpression({
  op,
  field,
  value,
  options,
}: SetRuleActionEntity) {
  return (
    <>
      <Text>{friendlyOp(op)}</Text>{' '}
      <Text style={valueStyle}>{mapField(field, options)}</Text>{' '}
      <Text>to </Text>
      <Value style={valueStyle} value={value} field={field} />
    </>
  );
}

function LinkScheduleActionExpression({
  op,
  value,
}: LinkScheduleRuleActionEntity) {
  return (
    <>
      <Text>{friendlyOp(op)}</Text> <ScheduleValue value={value} />
    </>
  );
}
