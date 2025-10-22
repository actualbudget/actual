import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  mapField,
  friendlyOp,
  getAllocationMethods,
} from 'loot-core/shared/rules';
import {
  type SetSplitAmountRuleActionEntity,
  type LinkScheduleRuleActionEntity,
  type RuleActionEntity,
  type SetRuleActionEntity,
  type AppendNoteRuleActionEntity,
  type PrependNoteRuleActionEntity,
  type DeleteTransactionRuleActionEntity,
} from 'loot-core/types/models';

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
      ) : props.op === 'delete-transaction' ? (
        <DeleteTransactionActionExpression {...props} />
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
  const { t } = useTranslation();
  return (
    <>
      <Text>{friendlyOp(op)}</Text>{' '}
      <Text style={valueStyle}>{mapField(field, options)}</Text>{' '}
      <Text>{t('to ')}</Text>
      {options?.formula ? (
        <>
          <Text>{t('formula ')}</Text>
          <Text style={valueStyle}>{options.formula}</Text>
        </>
      ) : options?.template ? (
        <>
          <Text>{t('template ')}</Text>
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
      <Text style={valueStyle}>{getAllocationMethods()[method]}</Text>
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

function DeleteTransactionActionExpression({
  op,
}: DeleteTransactionRuleActionEntity) {
  return <Text>{friendlyOp(op)}</Text>;
}
