import React from 'react';

import * as queries from 'loot-core/src/client/queries';
import { currencyToInteger } from 'loot-core/src/shared/util';

import CheckCircle1 from '../../icons/v2/CheckCircle1';
import { styles, theme } from '../../style';
import Button from '../common/Button';
import InitialFocus from '../common/InitialFocus';
import Input from '../common/Input';
import Text from '../common/Text';
import View from '../common/View';
import useFormat from '../spreadsheet/useFormat';
import useSheetValue from '../spreadsheet/useSheetValue';
import { Tooltip } from '../tooltips';

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
  let format = useFormat();
  let targetDiff = targetBalance - cleared;

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
              color: theme.noticeText,
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
          <Button type="primary" onClick={onDone}>
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
  let balanceQuery = queries.accountBalance(account);
  let clearedBalance = useSheetValue({
    name: balanceQuery.name + '-cleared',
    value: null,
    query: balanceQuery.query.filter({ cleared: true }),
  });
  let format = useFormat();

  function onSubmit(e) {
    e.preventDefault();
    let input = e.target.elements[0];
    let amount = currencyToInteger(input.value);
    if (amount != null) {
      onReconcile(amount == null ? clearedBalance : amount);
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
          {clearedBalance != null && (
            <InitialFocus>
              <Input
                defaultValue={format(clearedBalance, 'financial')}
                style={{ margin: '7px 0' }}
              />
            </InitialFocus>
          )}
          <Button type="primary">Reconcile</Button>
        </form>
      </View>
    </Tooltip>
  );
}
