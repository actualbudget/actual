import React from 'react';

import {
  mapField,
  friendlyOp,
  ALLOCATION_METHODS,
} from 'loot-core/src/shared/rules';
import {
  type SetSplitAmountRuleActionEntity,
  type LinkScheduleRuleActionEntity,
  type RuleActionEntity,
  type SetRuleActionEntity,
  type AppendNoteRuleActionEntity,
  type PrependNoteRuleActionEntity,
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
      ) : props.op === 'set-split-amount' ? (
        <SetSplitAmountActionExpression {...props} />
      ) : props.op === 'link-schedule' ? (
        <LinkScheduleActionExpression {...props} />
      ) : props.op === 'prepend-notes' ? (
        <PrependNoteActionExpression {...props} />
      ) : props.op === 'append-notes' ? (
        <AppendNoteActionExpression {...props} />
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
      {options?.template ? (
        <>
          <Text>template </Text>
          <Text style={valueStyle}>{options.template}</Text>
        </>
      ) : (
        <Value style={valueStyle} value={value} field={field} />
      )}
    </>
  );
}

function SetSplitAmountActionExpression({
  op,
  value,
  options,
}: SetSplitAmountRuleActionEntity) {
  const method = options?.method;
  if (!method) {
    return null;
  }

  return (
    <>
      <Text>{friendlyOp(op)}</Text>{' '}
      <Text style={valueStyle}>{ALLOCATION_METHODS[method]}</Text>
      {method !== 'remainder' && ': '}
      {method === 'fixed-amount' && (
        <Value style={valueStyle} value={value} field="amount" />
      )}
      {method === 'fixed-percent' && <Text style={valueStyle}>{value}%</Text>}
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

function PrependNoteActionExpression({
  op,
  value,
}: PrependNoteRuleActionEntity) {
  return (
    <>
      <Text>{friendlyOp(op)}</Text>{' '}
      <Value style={valueStyle} value={value} field="notes" />
    </>
  );
}

function AppendNoteActionExpression({ op, value }: AppendNoteRuleActionEntity) {
  return (
    <>
      <Text>{friendlyOp(op)}</Text>{' '}
      <Value style={valueStyle} value={value} field="notes" />
    </>
  );
}
