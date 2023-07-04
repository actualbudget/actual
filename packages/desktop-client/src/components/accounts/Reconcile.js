import React from 'react';

import * as queries from 'loot-core/src/client/queries';
import { currencyToInteger } from 'loot-core/src/shared/util';

import CheckCircle1 from '../../icons/v2/CheckCircle1';
import { styles, colors } from '../../style';
import { View, Text, Button, Input, InitialFocus, Tooltip } from '../common';
import format from '../spreadsheet/format';
import useSheetValue from '../spreadsheet/useSheetValue';

export function ReconcilingMessage({
  balanceQuery,
  targetBalance,
  onDone,
  onCreateTransaction,
}) {
  let cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    value: 0,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  let targetDiff = targetBalance - cleared;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: 'white',
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
              color: colors.g4,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle1
              style={{
                width: 13,
                height: 13,
                color: colors.g5,
                marginRight: 3,
              }}
            />
            All reconciled!
          </View>
        ) : (
          <View style={{ color: colors.n3 }}>
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
          <Button primary onClick={onDone}>
            Done Reconciling
          </Button>
        </View>
        {targetDiff !== 0 && (
          <View style={{ marginLeft: 15 }}>
            <Button onClick={() => onCreateTransaction(targetDiff)}>
              Create Reconciliation Transaction
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

export function ReconcileTooltip({ account, onReconcile, onClose }) {
  let balance = useSheetValue(queries.accountBalance(account));

  function onSubmit(e) {
    e.preventDefault();
    let input = e.target.elements[0];
    let amount = currencyToInteger(input.value);
    if (amount != null) {
      onReconcile(amount == null ? balance : amount);
      onClose();
    } else {
      input.select();
    }
  }

  return (
    <Tooltip position="bottom-right" width={275} onClose={onClose}>
      <View style={{ padding: '5px 8px' }}>
        <Text>
          Enter the current balance of your bank account that you want to
          reconcile with:
        </Text>
        <form onSubmit={onSubmit}>
          {balance != null && (
            <InitialFocus>
              <Input
                defaultValue={format(balance, 'financial')}
                style={{ margin: '7px 0' }}
              />
            </InitialFocus>
          )}
          <Button primary>Reconcile</Button>
        </form>
      </View>
    </Tooltip>
  );
}
