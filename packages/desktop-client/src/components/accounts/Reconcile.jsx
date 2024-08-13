import React, { useState } from 'react';

import * as queries from 'loot-core/src/client/queries';
import { currencyToInteger } from 'loot-core/src/shared/util';

import { SvgCheckCircle1 } from '../../icons/v2';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { useFormat } from '../spreadsheet/useFormat';
import { useSheetValue } from '../spreadsheet/useSheetValue';

export function ReconcilingMessage({
  balanceQuery,
  targetBalance,
  onDone,
  onCreateTransaction,
}) {
  const cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    value: 0,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const format = useFormat();
  const targetDiff = targetBalance - cleared;

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
            All reconciled!
          </View>
        ) : (
          <View style={{ color: theme.tableText }}>
            <Text style={{ fontStyle: 'italic', textAlign: 'center' }}>
              Your cleared balance{' '}
              <strong>{format(cleared, 'financial')}</strong> needs{' '}
              <strong>
                {(targetDiff > 0 ? '+' : '') + format(targetDiff, 'financial')}
              </strong>{' '}
              to match
              <br /> your bank’s balance of{' '}
              <Text style={{ fontWeight: 700 }}>
                {format(targetBalance, 'financial')}
              </Text>
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 15 }}>
          <Button variant="primary" onPress={onDone}>
            Done Reconciling
          </Button>
        </View>
        {targetDiff !== 0 && (
          <View style={{ marginLeft: 15 }}>
            <Button onPress={() => onCreateTransaction(targetDiff)}>
              Create Reconciliation Transaction
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

export function ReconcileMenu({ account, onReconcile, onClose }) {
  const balanceQuery = queries.accountBalance(account);
  const clearedBalance = useSheetValue({
    name: balanceQuery.name + '-cleared',
    value: null,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  const format = useFormat();
  const [inputValue, setInputValue] = useState(null);
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
        Enter the current balance of your bank account that you want to
        reconcile with:
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
        Reconcile
      </Button>
    </View>
  );
}
