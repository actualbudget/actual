import React, {useEffect, useState} from 'react';
import { styles, colors } from '../../style';
import {View, Text, Modal, P, Button, Strong, CustomSelect} from '../common';
import {normalizeAccount} from "loot-core/src/server/accounts/sync";

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
            boxShadow: styles.shadow,
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
            {account.product}
            <Text style={{ marginLeft: 4 }}>
              ...
              {account.currency}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function SelectLinkedAccounts({
  upgradingAccountId,
  modalProps,
  requisitionId,
  accounts,
  actualAccounts,
  actions
}) {
  let [chosenAccounts, setChosenAccounts] = useState([])

  accounts = accounts.map((acc) => {
    const normalizedAccount = normalizeAccount(acc);
    return {
      ...acc,
      ...normalizedAccount
    }
  })

  const addAccountOption = { id: 'new', name: 'Create new account' };

  const importedAccountsToSelect =
    accounts.filter((account) => !chosenAccounts.map((acc) => acc.chosenImportedAccountId).includes(account.id))

  const actualAccountsToSelect = [
    addAccountOption,
    ...actualAccounts.filter((account) => !chosenAccounts.map((acc) => acc.chosenActualAccountId).includes(account.id)),
  ]

  useEffect(() => {
    importedAccountsToSelect.forEach( importedAccount =>{
      const matchedActualAccount = actualAccountsToSelect.find(actualAccount => {
        return actualAccount.account_id === importedAccount.id || actualAccount.iban === importedAccount.iban
      })

      if(matchedActualAccount) {
        setChosenAccounts([
          ...chosenAccounts,
          {
            chosenImportedAccountId: importedAccount.id,
            chosenActualAccountId: matchedActualAccount.id
          }
        ]);
      }
    })
    }, []
  );

  let [selectedImportAccountId, setSelectedImportAccountId] = useState(importedAccountsToSelect[0] && importedAccountsToSelect[0].id);
  let [selectedAccountId, setSelectedAccountId] = useState(actualAccountsToSelect[0] && actualAccountsToSelect[0].id);

  async function onNext() {
    chosenAccounts.forEach((chosenAccount) => {
      const importedAccount = accounts.find((account) => account.id === chosenAccount.chosenImportedAccountId)

      actions.linkAccount(
        requisitionId,
        importedAccount,
        chosenAccount.chosenActualAccountId !== addAccountOption.id ? chosenAccount.chosenActualAccountId : undefined
      );
    })

    actions.closeModal();
  }

  function addToChosenAccounts() {
    setChosenAccounts([
      ...chosenAccounts,
      {
        chosenImportedAccountId: selectedImportAccountId,
        chosenActualAccountId: selectedAccountId
      }
    ]);

    const newSelectedImportAccountId = importedAccountsToSelect[0] && importedAccountsToSelect[0].id;
    const newSelectedAccountId = actualAccountsToSelect[0] && actualAccountsToSelect[0].id;
    setSelectedImportAccountId(newSelectedImportAccountId);
    setSelectedAccountId(newSelectedAccountId);
  }

  const removeChoose = (chosenAccount) => {
    setChosenAccounts([...chosenAccounts.filter((acc) => acc !== chosenAccount)]);
  }

  return (
    <Modal
      title={'Link Accounts'}
      {...modalProps}
    >
      {() => (
        <View style={{ maxWidth: 500 }}>
          {upgradingAccountId ? (
            <P>
              You allowed access to the following accounts.
              Select the one you want to link with:
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
                <View>
                  { importedAccountsToSelect.length ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-center',
                        margin: '30px 0',
                        borderBottom: 'solid 1px'
                      }}
                    >
                      <View>
                        <Strong>Imported Account:</Strong>
                        <CustomSelect
                          options={importedAccountsToSelect.map(account => [account.id, account.name])}
                          onChange={val => {
                            setSelectedImportAccountId(val);
                          }}
                          value={selectedImportAccountId}
                        />
                      </View>

                      <View>
                        <Strong>Actual Budget Account:</Strong>
                        <CustomSelect
                          options={actualAccountsToSelect.map(account => [account.id, account.name])}
                          onChange={val => {
                            setSelectedAccountId(val);
                          }}
                          value={selectedAccountId}
                        />
                      </View>

                      <Button
                        primary
                        style={{
                          padding: '10px',
                          fontSize: 15,
                          margin: 10,
                        }}
                        onClick={addToChosenAccounts}
                      >
                        Link account &rarr;
                      </Button>
                    </View>
                  ) : '' }
                  { chosenAccounts.map((chosenAccount) => {
                      const {chosenImportedAccountId, chosenActualAccountId} = chosenAccount
                      const importedAccount = accounts.find((acc) => acc.id === chosenImportedAccountId )
                      const actualAccount = [
                        addAccountOption,
                        ...actualAccounts,
                      ].find((acc) => acc.id === chosenActualAccountId )

                      return (
                        <View
                          key={chosenImportedAccountId}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-center',
                            marginTop: 30
                          }}
                        >
                          {importedAccount.name} -> {actualAccount.name}

                          <Button
                            primary
                            style={{
                              padding: '10px',
                              fontSize: 15,
                              margin: 10,
                            }}
                            onClick={() => removeChoose(chosenAccount)}
                          >
                            Remove &rarr;
                          </Button>
                        </View>
                      )
                    })
                  }
                </View>
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
            <Button primary onClick={onNext} disabled={!chosenAccounts.length}>
              Link accounts
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}
