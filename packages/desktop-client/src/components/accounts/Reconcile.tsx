import React, { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheckCircle1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { Query } from '@actual-app/core/shared/query';
import {
  integerToCurrencyForEdit,
  tsToRelativeTime,
} from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type { AccountEntity } from '@actual-app/core/types/models';
import type { TransObjectLiteral } from '@actual-app/core/types/util';
import { format as formatDate } from 'date-fns';
import { t } from 'i18next';

import { useDateFormat } from '#hooks/useDateFormat';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useForeignCurrencyCode } from '#hooks/useMultiCurrency';
import { useSheetValue } from '#hooks/useSheetValue';
import * as bindings from '#spreadsheet/bindings';

type ReconcilingMessageProps = {
  balanceQuery: { name: `balance-query-${string}`; query: Query };
  targetBalance: number;
  // The currency of the account, when it has one of its own
  currencyCode?: string | null;
  onDone: () => void;
  onCreateTransaction: (targetDiff: number) => void;
};

export function ReconcilingMessage({
  balanceQuery,
  targetBalance,
  currencyCode,
  onDone,
  onCreateTransaction,
}: ReconcilingMessageProps) {
  const cleared =
    useSheetValue<'balance', `balance-query-${string}-cleared`>({
      name: (balanceQuery.name +
        '-cleared') as `balance-query-${string}-cleared`,
      value: 0,
      query: balanceQuery.query.filter({ cleared: true }),
    }) ?? 0;
  const format = useFormat();
  const foreignCurrencyCode = useForeignCurrencyCode(currencyCode);
  // Balances in another currency carry its code and decimal places
  const formatOptions = { currencyCode: foreignCurrencyCode };
  const targetDiff = targetBalance - cleared;

  const clearedBalance = format(cleared, 'financial', formatOptions);
  const bankBalance = format(targetBalance, 'financial', formatOptions);
  const difference =
    (targetDiff > 0 ? '+' : '') +
    format(targetDiff, 'financial', formatOptions);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: theme.tableBackground,
        ...styles.shadow,
        borderRadius: 4,
        marginTop: 5,
        marginBottom: 15,
        padding: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {targetDiff === 0 ? (
          <View
            style={{
              color: theme.noticeTextLight,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SvgCheckCircle1
              style={{
                width: 13,
                height: 13,
                color: 'inherit',
                marginRight: 3,
              }}
            />
            <Trans>All reconciled!</Trans>
          </View>
        ) : (
          <View style={{ color: theme.tableText }}>
            <Text style={{ fontStyle: 'italic', textAlign: 'center' }}>
              <Trans>
                Your cleared balance{' '}
                <strong>{{ clearedBalance } as TransObjectLiteral}</strong>{' '}
                needs <strong>{{ difference } as TransObjectLiteral}</strong> to
                match
                <br /> your bank&apos;s balance of{' '}
                <Text style={{ fontWeight: 700 }}>
                  {{ bankBalance } as TransObjectLiteral}
                </Text>
              </Trans>
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 15 }}>
          <Button variant="primary" onPress={onDone}>
            {targetDiff === 0
              ? t('Lock transactions')
              : t('Exit reconciliation')}
          </Button>
        </View>
        {targetDiff !== 0 && (
          <View style={{ marginLeft: 15 }}>
            <Button onPress={() => onCreateTransaction(targetDiff)}>
              <Trans>Create reconciliation transaction</Trans>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

// A balance as it is entered: one in another currency than the default
// keeps all of its decimals, even ones that currency doesn't show, so
// reconciling never rounds it
function formatEditBalance(
  format: ReturnType<typeof useFormat>,
  balance: IntegerAmount,
  foreignCurrencyCode: string | undefined,
) {
  return foreignCurrencyCode === undefined
    ? format(balance, 'financial')
    : integerToCurrencyForEdit(balance, foreignCurrencyCode);
}

type ReconcileMenuProps = {
  account: AccountEntity;
  onReconcile: (amount: number | null) => void;
  onClose: () => void;
};

export function ReconcileMenu({
  account,
  onReconcile,
  onClose,
}: ReconcileMenuProps) {
  const balanceQuery = bindings.accountBalance(account.id);
  const clearedBalance = useSheetValue<'account', `balance-${string}-cleared`>({
    name: (balanceQuery.name + '-cleared') as `balance-${string}-cleared`,
    value: null,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const lastSyncedBalance = account.balance_current;
  const format = useFormat();
  const foreignCurrencyCode = useForeignCurrencyCode(account.currency);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const locale = useLocale();

  const [inputValue, setInputValue] = useState<string | null>();
  // useEffect is needed here. clearedBalance does not work as a default value for inputValue and
  // to use a button to update inputValue we can't use defaultValue in the input form below
  useEffect(() => {
    if (clearedBalance != null) {
      setInputValue(
        formatEditBalance(format, clearedBalance, foreignCurrencyCode),
      );
    }
  }, [clearedBalance, format, foreignCurrencyCode]);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (inputValue === '') {
      return;
    }

    const amount =
      inputValue != null
        ? format.fromEdit(inputValue, clearedBalance)
        : clearedBalance;

    onReconcile(amount);
    onClose();
  }

  return (
    <Form onSubmit={onSubmit}>
      <View style={{ padding: '5px 8px' }}>
        <Text>
          <Trans>
            Enter the current balance of your bank account that you want to
            reconcile with:
          </Trans>
        </Text>
        {inputValue != null && (
          <InitialFocus>
            <Input
              value={inputValue}
              onChangeValue={setInputValue}
              style={{ margin: '7px 0', textAlign: 'right' }}
            />
          </InitialFocus>
        )}
        {lastSyncedBalance != null && (
          <View>
            <Text style={{ margin: '0 6px 8px 0', textAlign: 'right' }}>
              <Trans>Last Balance from Bank: </Trans>
              {format(lastSyncedBalance, 'financial', {
                currencyCode: foreignCurrencyCode,
              })}
            </Text>
            <Button
              onPress={() =>
                setInputValue(
                  formatEditBalance(
                    format,
                    lastSyncedBalance,
                    foreignCurrencyCode,
                  ),
                )
              }
              style={{ marginBottom: 7 }}
            >
              <Trans>Use last synced total</Trans>
            </Button>
          </View>
        )}
        <Button type="submit" variant="primary">
          <Trans>Reconcile</Trans>
        </Button>
        <Text
          style={{
            color: theme.pageTextLight,
            marginTop: '8px',
            textAlign: 'center',
          }}
        >
          {account?.last_reconciled
            ? t('Reconciled {{ relativeTimeAgo }} ({{ absoluteDate }})', {
                relativeTimeAgo: tsToRelativeTime(
                  account.last_reconciled,
                  locale,
                ),
                absoluteDate: formatDate(
                  new Date(parseInt(account.last_reconciled ?? '0', 10)),
                  dateFormat,
                  { locale },
                ),
              })
            : t('Not yet reconciled')}
        </Text>
      </View>
    </Form>
  );
}
