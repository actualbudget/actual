import React, { useState } from 'react';

import {
  fromPlaidAccountType,
  prettyAccountType
} from 'loot-core/src/shared/accounts';

import { styles, colors } from '../../style';
import { View, Text, Modal, P, Button } from '../common';

let selectedStyle = {
  color: colors.n1
};

function EmptyMessage() {
  return null;
}

function Account({ account, selected, onSelect }) {
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
            border: '1px solid ' + colors.n10,
            ':hover': selectedStyle
          },
          selected && {
            ...selectedStyle,
            borderColor: colors.b9,
            backgroundColor: colors.b10
          }
        ]}
      >
        <View>
          <View style={{ fontWeight: 600, flex: 1 }}>{account.name}</View>
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
      </View>
    </View>
  );
}

export default function SelectLinkedAccounts({
  institution,
  publicToken,
  upgradingId,
  modalProps,
  accounts,
  actions
}) {
  let [selectedAccounts, setSelectedAccounts] = useState([]);

  function toggleAccount(id) {
    if (upgradingId) {
      setSelectedAccounts([id]);
    } else {
      if (selectedAccounts.includes(id)) {
        setSelectedAccounts(selectedAccounts.filter(x => x !== id));
      } else {
        setSelectedAccounts([...selectedAccounts, id]);
      }
    }
  }

  async function onNext() {
    if (selectedAccounts.length > 0) {
      if (upgradingId) {
        actions.linkAccount(
          institution,
          publicToken,
          selectedAccounts[0],
          upgradingId
        );
        actions.closeModal();
      } else {
        actions.pushModal('configure-linked-accounts', {
          institution,
          publicToken,
          accounts: selectedAccounts.map(id =>
            accounts.find(acct => acct.id === id)
          )
        });
      }
    }
  }

  return (
    <Modal
      title={upgradingId ? 'Link Account' : 'Link Accounts'}
      {...modalProps}
    >
      {() => (
        <View style={{ maxWidth: 500 }}>
          {upgradingId ? (
            <P>
              We found the following accounts. Select the one you want to link
              with:
            </P>
          ) : (
            <P>
              We found the following accounts. Select which ones you want to
              add:
            </P>
          )}

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
                  let selected = selectedAccounts.includes(account.id);

                  return (
                    <Account
                      key={account.id}
                      account={account}
                      selected={selected}
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
            <Button style={{ marginRight: 10 }} onClick={modalProps.onClose}>
              Cancel
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
