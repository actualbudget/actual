import React, { useState } from 'react';

import {
  fromPlaidAccountType,
  determineOffBudget,
  prettyAccountType
} from 'loot-core/src/shared/accounts';
import Checkmark from 'loot-design/src/svg/v1/Checkmark';

import { styles, colors } from '../../style';
import { View, Text, Modal, Button } from '../common';

function EmptyMessage() {
  return null;
}

function Account({ account, offbudget, onSelect }) {
  return (
    <View
      style={[
        { marginBottom: 8, flexShrink: 0, userSelect: 'none' },
        styles.mediumText
      ]}
      onClick={onSelect}
    >
      <View
        style={[
          {
            padding: 12,
            ...styles.shadow,
            cursor: 'pointer',
            transition: 'transform .20s',
            fontSize: 14,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
            border: '1px solid ' + colors.n10
          }
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ fontWeight: 600 }}>{account.name}</View>
          <View
            style={{
              fontSize: 13,
              color: colors.n5,
              flexDirection: 'row'
            }}
          >
            {prettyAccountType(
              fromPlaidAccountType(account.type, account.subtype)
            )}
            <Text style={{ marginLeft: 4 }}>
              ...
              {account.mask}
            </Text>
          </View>
        </View>

        {offbudget ? (
          <Text style={{ color: colors.n8 }}>Off budget</Text>
        ) : (
          <>
            <Checkmark style={{ width: 15, height: 15, color: colors.g5 }} />
            <Text style={{ color: colors.g5, marginLeft: 5 }}>Budgeted</Text>
          </>
        )}
      </View>
    </View>
  );
}

export default function ConfigureLinkedAccounts({
  institution,
  publicToken,
  upgradingId,
  modalProps,
  accounts,
  actions
}) {
  let [offbudgetAccounts, setOffbudgetAccounts] = useState(() =>
    accounts
      .filter(acct => determineOffBudget(fromPlaidAccountType(acct.type)))
      .map(acct => acct.id)
  );

  function toggleAccount(id) {
    if (offbudgetAccounts.includes(id)) {
      setOffbudgetAccounts(offbudgetAccounts.filter(x => x !== id));
    } else {
      setOffbudgetAccounts([...offbudgetAccounts, id]);
    }
  }

  async function onNext() {
    let ids = await actions.connectAccounts(
      institution,
      publicToken,
      accounts.map(acct => acct.id),
      offbudgetAccounts
    );

    actions.closeModal();

    if (ids.length === 1) {
      window.location.hash = '/accounts/' + ids[0];
    } else if (ids.length > 0) {
      window.location.hash = '/accounts';
    }
  }

  return (
    <Modal
      title={upgradingId ? 'Link Account' : 'Link Accounts'}
      {...modalProps}
    >
      {() => (
        <View style={{ maxWidth: 500 }}>
          <Text style={{ fontSize: 15, marginBottom: 15, lineHeight: '1.4em' }}>
            A <strong>budgeted account</strong> is one where expenses and income
            affect the budget. Usually things like investments are off budget.
            We{"'"}ve chosen some defaults here, but you can change the status
            if you like.
          </Text>

          <View
            style={{
              maxHeight: 300,
              overflow: 'auto',
              // Allow the shadow to appear on left/right edge
              paddingLeft: 5,
              paddingRight: 5,
              marginLeft: -5,
              marginRight: -5
            }}
          >
            <View>
              {accounts.length === 0 ? (
                <EmptyMessage />
              ) : (
                accounts.map(account => {
                  let offbudget = offbudgetAccounts.includes(account.id);

                  return (
                    <Account
                      key={account.id}
                      account={account}
                      offbudget={offbudget}
                      onSelect={() => toggleAccount(account.id)}
                    />
                  );
                })
              )}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 30
            }}
          >
            <Button style={{ marginRight: 10 }} onClick={modalProps.onBack}>
              Back
            </Button>
            <Button primary onClick={onNext}>
              {upgradingId ? 'Link Account' : 'Next'}
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
