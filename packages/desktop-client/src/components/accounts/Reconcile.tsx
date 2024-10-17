import React, { useState } from 'react';
import { Trans } from 'react-i18next';

import * as queries from 'loot-core/src/client/queries';
import { type Query } from 'loot-core/src/shared/query';
import { currencyToInteger } from 'loot-core/src/shared/util';
import { type AccountEntity } from 'loot-core/types/models';

import { SvgCheckCircle1 } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type ReconcilingMessageProps = {
  accountId: AccountEntity['id'] | string;
  balanceQuery: Query;
  targetBalance: number;
  onDone: () => void;
  onCreateTransaction: (targetDiff: number) => void;
};

export function ReconcilingMessage({
  accountId,
  balanceQuery,
  targetBalance,
  onDone,
  onCreateTransaction,
}: ReconcilingMessageProps) {
  const cleared = useSheetValue<'balance', `balance-query-${string}-cleared`>({
    name: `balance-query-${accountId}-cleared`,
    value: 0,
    query: balanceQuery.filter({ cleared: true }),
  } as const);
  const format = useFormat();
  const targetDiff = targetBalance - cleared;

  const clearedBalance = format(cleared, 'financial');
  const bankBalance = format(targetBalance, 'financial');
  const difference =
    (targetDiff > 0 ? '+' : '') + format(targetDiff, 'financial');

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
                Your cleared balance <strong>{clearedBalance}</strong> needs{' '}
                <strong>{difference}</strong> to match
                <br /> your bank&apos;s balance of{' '}
                <Text style={{ fontWeight: 700 }}>{bankBalance}</Text>
              </Trans>
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 15 }}>
          <Button variant="primary" onPress={onDone}>
            <Trans>Done Reconciling</Trans>
          </Button>
        </View>
        {targetDiff !== 0 && (
          <View style={{ marginLeft: 15 }}>
            <Button onPress={() => onCreateTransaction(targetDiff)}>
              <Trans>Create Reconciliation Transaction</Trans>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
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
  const balanceQuery = queries.accountBalance(account);
  const clearedBalance = useSheetValue<'account', `balance-${string}-cleared`>({
    name: (balanceQuery.name + '-cleared') as `balance-${string}-cleared`,
    value: null,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const format = useFormat();
  const [inputValue, setInputValue] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  function onSubmit() {
    if (inputValue === '') {
      setInputFocused(true);
      return;
    }

    const amount =
      inputValue != null ? currencyToInteger(inputValue) : clearedBalance;

    onReconcile(amount);
    onClose();
  }

  return (
    <View style={{ padding: '5px 8px' }}>
      <Text>
        <Trans>
          Enter the current balance of your bank account that you want to
          reconcile with:
        </Trans>
      </Text>
      {clearedBalance != null && (
        <InitialFocus>
          <Input
            defaultValue={format(clearedBalance, 'financial')}
            onChangeValue={setInputValue}
            style={{ margin: '7px 0' }}
            focused={inputFocused}
            onEnter={onSubmit}
          />
        </InitialFocus>
      )}
      <Button variant="primary" onPress={onSubmit}>
        <Trans>Reconcile</Trans>
      </Button>
    </View>
  );
}
