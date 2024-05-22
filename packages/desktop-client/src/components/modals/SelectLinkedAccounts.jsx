import React, { useState } from 'react';

import { useAccounts } from '../../hooks/useAccounts';
import { theme } from '../../style';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { TableHeader, Table, Row, Field } from '../table';

const addOnBudgetAccountOption = { id: 'new-on', name: 'Create new account' };
const addOffBudgetAccountOption = {
  id: 'new-off',
  name: 'Create new account (off-budget)',
};

export function SelectLinkedAccounts({
  modalProps,
  requisitionId,
  externalAccounts,
  actions,
  syncSource,
}) {
  const localAccounts = useAccounts().filter(a => a.closed === 0);
  const [chosenAccounts, setChosenAccounts] = useState(() => {
    return Object.fromEntries(
      localAccounts
        .filter(acc => acc.account_id)
        .map(acc => [acc.account_id, acc.id]),
    );
  });

  async function onNext() {
    const chosenLocalAccountIds = Object.values(chosenAccounts);

    // Unlink accounts that were previously linked, but the user
    // chose to remove the bank-sync
    localAccounts
      .filter(acc => acc.account_id)
      .filter(acc => !chosenLocalAccountIds.includes(acc.id))
      .forEach(acc => actions.unlinkAccount(acc.id));

    // Link new accounts
    Object.entries(chosenAccounts).forEach(
      ([chosenExternalAccountId, chosenLocalAccountId]) => {
        const externalAccount = externalAccounts.find(
          account => account.account_id === chosenExternalAccountId,
        );
        const offBudget = chosenLocalAccountId === addOffBudgetAccountOption.id;

        // Skip linking accounts that were previously linked with
        // a different bank.
        if (!externalAccount) {
          return;
        }

        // Finally link the matched account
        if (syncSource === 'simpleFin') {
          actions.linkAccountSimpleFin(
            externalAccount,
            chosenLocalAccountId !== addOnBudgetAccountOption.id &&
              chosenLocalAccountId !== addOffBudgetAccountOption.id
              ? chosenLocalAccountId
              : undefined,
            offBudget,
          );
        } else {
          actions.linkAccount(
            requisitionId,
            externalAccount,
            chosenLocalAccountId !== addOnBudgetAccountOption.id &&
              chosenLocalAccountId !== addOffBudgetAccountOption.id
              ? chosenLocalAccountId
              : undefined,
            offBudget,
          );
        }
      },
    );

    actions.closeModal();
  }

  const unlinkedAccounts = localAccounts.filter(
    account => !Object.values(chosenAccounts).includes(account.id),
  );

  function onSetLinkedAccount(externalAccount, localAccountId) {
    setChosenAccounts(accounts => {
      const updatedAccounts = { ...accounts };

      if (localAccountId) {
        updatedAccounts[externalAccount.account_id] = localAccountId;
      } else {
        delete updatedAccounts[externalAccount.account_id];
      }

      return updatedAccounts;
    });
  }

  return (
    <Modal title="Link Accounts" {...modalProps} style={{ width: 800 }}>
      {() => (
        <>
          <Text style={{ marginBottom: 10 }}>
            We found the following accounts. Select which ones you want to add:
          </Text>
          <View
            style={{
              flex: 'unset',
              height: 300,
              border: '1px solid ' + theme.tableBorder,
            }}
          >
            <TableHeader
              headers={[
                { name: 'Bank Account To Sync', width: '40%' },
                { name: 'Account in Actual', width: '40%' },
                { name: 'Action', width: '20%' },
              ]}
            />

            <Table
              items={externalAccounts}
              style={{ backgroundColor: theme.tableHeaderBackground }}
              getItemKey={index => index}
              renderItem={({ key, item }) => (
                <View key={key}>
                  <TableRow
                    externalAccount={item}
                    chosenAccount={
                      chosenAccounts[item.account_id] ===
                      addOnBudgetAccountOption.id
                        ? addOnBudgetAccountOption
                        : chosenAccounts[item.account_id] ===
                            addOffBudgetAccountOption.id
                          ? addOffBudgetAccountOption
                          : localAccounts.find(
                              acc => chosenAccounts[item.account_id] === acc.id,
                            )
                    }
                    unlinkedAccounts={unlinkedAccounts}
                    onSetLinkedAccount={onSetLinkedAccount}
                  />
                </View>
              )}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 10,
            }}
          >
            <Button
              type="primary"
              onClick={onNext}
              disabled={!Object.keys(chosenAccounts).length}
            >
              Link accounts
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}

function TableRow({
  externalAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}) {
  const [focusedField, setFocusedField] = useState(null);

  const availableAccountOptions = [
    ...unlinkedAccounts,
    chosenAccount?.id !== addOnBudgetAccountOption.id && chosenAccount,
    addOnBudgetAccountOption,
    addOffBudgetAccountOption,
  ].filter(Boolean);

  return (
    <Row style={{ backgroundColor: theme.tableBackground }}>
      <Field width="40%">{externalAccount.name}</Field>
      <Field
        width="40%"
        truncate={focusedField !== 'account'}
        onClick={() => setFocusedField('account')}
      >
        {focusedField === 'account' ? (
          <Autocomplete
            focused
            strict
            highlightFirst
            suggestions={availableAccountOptions}
            onSelect={value => {
              onSetLinkedAccount(externalAccount, value);
            }}
            inputProps={{
              onBlur: () => setFocusedField(null),
            }}
            value={chosenAccount?.id}
          />
        ) : (
          chosenAccount?.name
        )}
      </Field>
      <Field width="20%">
        {chosenAccount ? (
          <Button
            onClick={() => {
              onSetLinkedAccount(externalAccount, null);
            }}
            style={{ float: 'right' }}
          >
            Remove bank-sync
          </Button>
        ) : (
          <Button
            type="primary"
            onClick={() => {
              setFocusedField('account');
            }}
            style={{ float: 'right' }}
          >
            Setup bank-sync
          </Button>
        )}
      </Field>
    </Row>
  );
}
