import React, { useEffect, useState } from 'react';

import { View, Modal, P, Button, Strong, CustomSelect } from '../common';

function EmptyMessage() {
  return null;
}

export default function SelectLinkedAccounts({
  upgradingAccountId,
  modalProps,
  requisitionId,
  accounts: importedAccounts,
  actualAccounts,
  actions,
}) {
  let [chosenAccounts, setChosenAccounts] = useState([]);

  const addAccountOption = { id: 'new', name: 'Create new account' };

  const importedAccountsToSelect = importedAccounts.filter(
    account =>
      !chosenAccounts
        .map(acc => acc.chosenImportedAccountId)
        .includes(account.account_id),
  );

  const actualAccountsToSelect = [
    addAccountOption,
    ...actualAccounts.filter(
      account =>
        !chosenAccounts
          .map(acc => acc.chosenActualAccountId)
          .includes(account.id),
    ),
  ];

  useEffect(() => {
    const chosenAccountsToAdd = [];
    importedAccountsToSelect.forEach(importedAccount => {
      // Try to auto-match accounts based on account_id or mask
      // Add matched accounts to list of selected accounts
      const matchedActualAccount = actualAccountsToSelect.find(
        actualAccount => {
          return (
            actualAccount.account_id === importedAccount.account_id ||
            actualAccount.mask === importedAccount.mask
          );
        },
      );

      if (matchedActualAccount) {
        chosenAccountsToAdd.push({
          chosenImportedAccountId: importedAccount.account_id,
          chosenActualAccountId: matchedActualAccount.id,
        });
      }
    });

    setChosenAccounts([...chosenAccounts, ...chosenAccountsToAdd]);
  }, []);

  let [selectedImportAccountId, setSelectedImportAccountId] = useState(
    importedAccountsToSelect[0] && importedAccountsToSelect[0].account_id,
  );
  let [selectedAccountId, setSelectedAccountId] = useState(
    actualAccountsToSelect[0] && actualAccountsToSelect[0].id,
  );

  async function onNext() {
    chosenAccounts.forEach(chosenAccount => {
      const importedAccount = importedAccounts.find(
        account => account.account_id === chosenAccount.chosenImportedAccountId,
      );

      actions.linkAccount(
        requisitionId,
        importedAccount,
        chosenAccount.chosenActualAccountId !== addAccountOption.id
          ? chosenAccount.chosenActualAccountId
          : undefined,
      );
    });

    actions.closeModal();
  }

  function addToChosenAccounts() {
    setChosenAccounts([
      ...chosenAccounts,
      {
        chosenImportedAccountId: selectedImportAccountId,
        chosenActualAccountId: selectedAccountId,
      },
    ]);
  }

  // Update dropbox with available accounts to select
  useEffect(() => {
    const newSelectedImportAccountId =
      importedAccountsToSelect[0] && importedAccountsToSelect[0].account_id;
    const newSelectedAccountId =
      actualAccountsToSelect[0] && actualAccountsToSelect[0].id;
    setSelectedImportAccountId(newSelectedImportAccountId);
    setSelectedAccountId(newSelectedAccountId);
  }, [chosenAccounts]);

  const removeChoose = chosenAccount => {
    setChosenAccounts([...chosenAccounts.filter(acc => acc !== chosenAccount)]);
  };

  return (
    <Modal title={'Link Accounts'} {...modalProps}>
      {() => (
        <View style={{ maxWidth: 500 }}>
          {upgradingAccountId ? (
            <P>
              You allowed access to the following accounts. Select the one you
              want to link with:
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
              marginRight: -5,
            }}
          >
            <View>
              {importedAccounts.length === 0 ? (
                <EmptyMessage />
              ) : (
                <View>
                  {importedAccountsToSelect.length ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'flex-center',
                        margin: '30px 0',
                        borderBottom: 'solid 1px',
                      }}
                    >
                      <View>
                        <Strong>Imported Account:</Strong>
                        <CustomSelect
                          options={importedAccountsToSelect.map(account => [
                            account.account_id,
                            account.name,
                          ])}
                          onChange={val => {
                            setSelectedImportAccountId(val);
                          }}
                          value={selectedImportAccountId}
                        />
                      </View>

                      <View>
                        <Strong>Actual Budget Account:</Strong>
                        <CustomSelect
                          options={actualAccountsToSelect.map(account => [
                            account.id,
                            account.name,
                          ])}
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
                  ) : (
                    ''
                  )}
                  {chosenAccounts.map(chosenAccount => {
                    const { chosenImportedAccountId, chosenActualAccountId } =
                      chosenAccount;
                    const importedAccount = importedAccounts.find(
                      acc => acc.account_id === chosenImportedAccountId,
                    );
                    const actualAccount = [
                      addAccountOption,
                      ...actualAccounts,
                    ].find(acc => acc.id === chosenActualAccountId);

                    return (
                      <View
                        key={chosenImportedAccountId}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'flex-center',
                          marginTop: 30,
                        }}
                      >
                        {importedAccount.name} &rarr; {actualAccount.name}
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
                    );
                  })}
                </View>
              )}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 30,
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
