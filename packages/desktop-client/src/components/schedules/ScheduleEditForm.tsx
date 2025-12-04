// @ts-strict-ignore
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as monthUtils from 'loot-core/shared/months';
import {
  type RecurConfig,
  type ScheduleEntity,
  type TransactionEntity,
} from 'loot-core/types/models';

import {
  FormField,
  FormLabel,
  Checkbox,
} from '@desktop-client/components/forms';
import { OpSelect } from '@desktop-client/components/rules/RuleEditor';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { RecurringSchedulePicker } from '@desktop-client/components/select/RecurringSchedulePicker';
import { SelectedItemsButton } from '@desktop-client/components/table';
import { SimpleTransactionsTable } from '@desktop-client/components/transactions/SimpleTransactionsTable';
import {
  AmountInput,
  BetweenAmountInput,
} from '@desktop-client/components/util/AmountInput';
import { GenericInput } from '@desktop-client/components/util/GenericInput';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useLocale } from '@desktop-client/hooks/useLocale';
import {
  type Actions,
  SelectedProvider,
} from '@desktop-client/hooks/useSelected';

export type ScheduleFormFields = {
  payee: null | string;
  account: null | string;
  amount: null | number | { num1: number; num2: number };
  amountOp: null | string;
  date: null | string | RecurConfig;
  posts_transaction: boolean;
  name: null | string;
};

export type ScheduleEditFormDispatch =
  | {
      type: 'set-field';
      field: 'name' | 'account' | 'payee';
      value: string;
    }
  | {
      type: 'set-field';
      field: 'amountOp';
      value: 'is' | 'isbetween' | 'isapprox';
    }
  | {
      type: 'set-field';
      field: 'amount';
      value: number | { num1: number; num2: number };
    }
  | {
      type: 'set-field';
      field: 'date';
      value: string | RecurConfig;
    }
  | {
      type: 'set-field';
      field: 'posts_transaction';
      value: boolean;
    }
  | {
      type: 'set-repeats';
      repeats: boolean;
    };

type ScheduleEditFormProps = {
  fields: ScheduleFormFields;
  dispatch: (action: ScheduleEditFormDispatch) => void;
  upcomingDates: null | string[];
  repeats: boolean;
  schedule: Partial<ScheduleEntity>;
  adding: boolean;
  isCustom: boolean;
  onEditRule: (ruleId: string) => void;
  transactions: TransactionEntity[];
  transactionsMode: 'matched' | 'linked';
  error: null | string;
  selectedInst: { items: Set<string>; dispatch: (action: Actions) => void };
  onSwitchTransactions: (mode: 'linked' | 'matched') => void;
  onLinkTransactions: (ids: string[], scheduleId?: string) => Promise<void>;
  onUnlinkTransactions: (ids: string[]) => Promise<void>;
};

export function ScheduleEditForm({
  fields,
  dispatch,
  upcomingDates,
  repeats,
  schedule,
  adding,
  isCustom,
  onEditRule,
  transactions,
  transactionsMode,
  error,
  selectedInst,
  onSwitchTransactions,
  onLinkTransactions,
  onUnlinkTransactions,
}: ScheduleEditFormProps) {
  const locale = useLocale();
  const { t } = useTranslation();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const { isNarrowWidth } = useResponsive();

  return (
    <>
      <View style={{ display: 'block', overflow: 'scroll', padding: 10 }}>
        <SpaceBetween style={{ marginTop: 10 }}>
          <FormField style={{ flex: 1 }}>
            <FormLabel title={t('Schedule Name')} htmlFor="name-field" />
            <InitialFocus>
              <GenericInput
                type="string"
                value={fields.name}
                onChange={e => {
                  dispatch({ type: 'set-field', field: 'name', value: e });
                }}
              />
            </InitialFocus>
          </FormField>
        </SpaceBetween>
        <SpaceBetween
          style={{
            marginTop: 20,
            display: isNarrowWidth ? 'grid' : 'flex',
            gridTemplateColumns: '1fr 1fr',
          }}
        >
          <FormField style={{ flex: 1 }}>
            <FormLabel
              title={t('Payee')}
              id="payee-label"
              htmlFor="payee-field"
            />
            <GenericInput
              type="id"
              field="payee"
              value={fields.payee || ''}
              onChange={id =>
                dispatch({ type: 'set-field', field: 'payee', value: id })
              }
            />
          </FormField>

          <FormField style={{ flex: 1 }}>
            <FormLabel
              title={t('Account')}
              id="account-label"
              htmlFor="account-field"
            />
            <GenericInput
              type="id"
              field="account"
              value={fields.account || ''}
              onChange={id =>
                dispatch({ type: 'set-field', field: 'account', value: id })
              }
            />
          </FormField>

          <FormField style={{ flex: 1, gridColumn: '1 / -1' }}>
            <SpaceBetween style={{ marginBottom: 3, alignItems: 'center' }}>
              <FormLabel
                title={t('Amount')}
                htmlFor="amount-field"
                style={{ margin: 0, flex: 1 }}
              />
              <OpSelect
                ops={['isapprox', 'is', 'isbetween']}
                value={fields.amountOp as 'isapprox' | 'is' | 'isbetween'}
                formatOp={op => {
                  switch (op) {
                    case 'is':
                      return t('is exactly');
                    case 'isapprox':
                      return t('is approximately');
                    case 'isbetween':
                      return t('is between');
                    default:
                      throw new Error('Invalid op for select: ' + op);
                  }
                }}
                style={{
                  padding: '0 10px',
                  color: theme.pageTextLight,
                  fontSize: 12,
                }}
                onChange={(_, op) =>
                  dispatch({
                    type: 'set-field',
                    field: 'amountOp',
                    value: op,
                  })
                }
              />
            </SpaceBetween>
            {fields.amountOp === 'isbetween' ? (
              <BetweenAmountInput
                // @ts-expect-error fix me
                defaultValue={fields.amount}
                onChange={value =>
                  dispatch({
                    type: 'set-field',
                    field: 'amount',
                    value,
                  })
                }
              />
            ) : (
              <AmountInput
                id="amount-field"
                // @ts-expect-error fix me
                value={fields.amount}
                onUpdate={value =>
                  dispatch({
                    type: 'set-field',
                    field: 'amount',
                    value,
                  })
                }
              />
            )}
          </FormField>
        </SpaceBetween>

        <View style={{ marginTop: 20 }}>
          <FormLabel title={t('Date')} />
        </View>

        <SpaceBetween
          style={{
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ width: '13.44rem' }}>
            {repeats ? (
              <RecurringSchedulePicker
                // @ts-expect-error fix me
                value={fields.date}
                onChange={value =>
                  dispatch({ type: 'set-field', field: 'date', value })
                }
              />
            ) : (
              <DateSelect
                // @ts-expect-error fix me
                value={fields.date}
                onSelect={date =>
                  dispatch({ type: 'set-field', field: 'date', value: date })
                }
                dateFormat={dateFormat}
              />
            )}

            {upcomingDates && (
              <View style={{ fontSize: 13, marginTop: 20 }}>
                <Text style={{ color: theme.pageTextLight, fontWeight: 600 }}>
                  <Trans>Upcoming dates</Trans>
                </Text>
                <SpaceBetween
                  direction="vertical"
                  gap={5}
                  style={{
                    marginTop: 10,
                    color: theme.pageTextLight,
                    alignItems: 'flex-start',
                  }}
                >
                  {upcomingDates.map(date => (
                    <View key={date}>
                      {monthUtils.format(date, `${dateFormat} EEEE`, locale)}
                    </View>
                  ))}
                </SpaceBetween>
              </View>
            )}
          </View>

          <View
            style={{
              marginTop: 5,
              flexDirection: 'row',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            <Checkbox
              id="form_repeats"
              checked={repeats}
              onChange={e => {
                dispatch({ type: 'set-repeats', repeats: e.target.checked });
              }}
            />
            <label htmlFor="form_repeats" style={{ userSelect: 'none' }}>
              <Trans>Repeats</Trans>
            </label>
          </View>

          <SpaceBetween
            gap={5}
            direction="vertical"
            style={{ alignItems: 'flex-end' }}
          >
            <View
              style={{
                marginTop: 5,
                flexDirection: 'row',
                alignItems: 'center',
                userSelect: 'none',
                justifyContent: 'flex-end',
              }}
            >
              <Checkbox
                id="form_posts_transaction"
                checked={fields.posts_transaction}
                onChange={e => {
                  dispatch({
                    type: 'set-field',
                    field: 'posts_transaction',
                    value: e.target.checked,
                  });
                }}
              />
              <label
                htmlFor="form_posts_transaction"
                style={{ userSelect: 'none' }}
              >
                <Trans>Automatically add transaction</Trans>
              </label>
            </View>

            <Text
              style={{
                width: 350,
                textAlign: 'right',
                color: theme.pageTextLight,
                fontSize: 13,
                lineHeight: '1.4em',
              }}
            >
              <Trans>
                If checked, the schedule will automatically create transactions
                for you in the specified account
              </Trans>
            </Text>

            {!adding && schedule.rule && (
              <SpaceBetween style={{ marginTop: 20, alignItems: 'center' }}>
                {isCustom && (
                  <Text
                    style={{
                      color: theme.pageTextLight,
                      fontSize: 13,
                      textAlign: 'right',
                      width: 350,
                    }}
                  >
                    <Trans>
                      This schedule has custom conditions and actions
                    </Trans>
                  </Text>
                )}
                <Button onPress={() => onEditRule(schedule.rule)}>
                  <Trans>Edit as rule</Trans>
                </Button>
              </SpaceBetween>
            )}
          </SpaceBetween>
        </SpaceBetween>
      </View>

      <View
        style={{
          padding: 10,
          minHeight: 150,
          borderTop: `1px solid ${theme.tableBorder}`,
        }}
      >
        <SelectedProvider instance={selectedInst}>
          {adding ? (
            <View style={{ flexDirection: 'row', padding: '5px 0' }}>
              <Text style={{ color: theme.pageTextLight }}>
                <Trans>These transactions match this schedule:</Trans>
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ color: theme.pageTextLight }}>
                <Trans>Select transactions to link on save</Trans>
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Button
                variant="bare"
                style={{
                  color:
                    transactionsMode === 'linked'
                      ? theme.pageTextLink
                      : theme.pageTextSubdued,
                  marginRight: 10,
                  fontSize: 14,
                }}
                onPress={() => onSwitchTransactions('linked')}
              >
                <Trans>Linked transactions</Trans>
              </Button>{' '}
              <Button
                variant="bare"
                style={{
                  color:
                    transactionsMode === 'matched'
                      ? theme.pageTextLink
                      : theme.pageTextSubdued,
                  fontSize: 14,
                }}
                onPress={() => onSwitchTransactions('matched')}
              >
                <Trans>Find matching transactions</Trans>
              </Button>
              <View style={{ flex: 1 }} />
              <SelectedItemsButton
                id="transactions"
                name={count => t('{{count}} transactions', { count })}
                items={
                  transactionsMode === 'linked'
                    ? [{ name: 'unlink', text: t('Unlink from schedule') }]
                    : [{ name: 'link', text: t('Link to schedule') }]
                }
                onSelect={(name, ids) => {
                  switch (name) {
                    case 'link':
                      onLinkTransactions(ids, schedule.id);
                      break;
                    case 'unlink':
                      onUnlinkTransactions(ids);
                      break;
                    default:
                  }
                }}
              />
            </View>
          )}

          <SimpleTransactionsTable
            renderEmpty={
              <NoTransactionsMessage
                error={error}
                transactionsMode={transactionsMode}
              />
            }
            transactions={transactions}
            fields={['date', 'payee', 'notes', 'amount']}
            style={{
              border: '1px solid ' + theme.tableBorder,
              borderRadius: 4,
              overflow: 'hidden',
              marginTop: 5,
              maxHeight: 200,
            }}
          />
        </SelectedProvider>
      </View>

      {error && (
        <Text style={{ color: theme.errorText, marginTop: 10 }}>{error}</Text>
      )}
    </>
  );
}

type NoTransactionsMessageProps = {
  error: string | null;
  transactionsMode: 'matched' | 'linked';
};

function NoTransactionsMessage(props: NoTransactionsMessageProps) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        padding: 20,
        color: theme.pageTextLight,
        textAlign: 'center',
      }}
    >
      {props.error ? (
        <Text style={{ color: theme.errorText }}>
          <Trans>Could not search: {{ errorReason: props.error }}</Trans>
        </Text>
      ) : props.transactionsMode === 'matched' ? (
        t('No matching transactions')
      ) : (
        t('No linked transactions')
      )}
    </View>
  );
}
