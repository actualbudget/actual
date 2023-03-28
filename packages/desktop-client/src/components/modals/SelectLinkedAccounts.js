import React, { useState } from 'react';

import { colors } from '../../style';
import Autocomplete from '../autocomplete/NewAutocomplete';
import { View, Modal, Button, Text } from '../common';
import { TableHeader, Table, Row, Field } from '../table';

const addAccountOption = { value: 'new', label: 'Create new account' };

export default function SelectLinkedAccounts({
  modalProps,
  requisitionId,
  externalAccounts,
  localAccounts,
  actions,
}) {
  const [chosenAccounts, setChosenAccounts] = useState({});

  async function onNext() {
    Object.entries(chosenAccounts).forEach(
      ([chosenExternalAccountId, chosenLocalAccountId]) => {
        const externalAccount = externalAccounts.find(
          account => account.account_id === chosenExternalAccountId,
        );

        actions.linkAccount(
          requisitionId,
          externalAccount,
          chosenLocalAccountId !== addAccountOption.value
            ? chosenLocalAccountId
            : undefined,
        );
      },
    );

    actions.closeModal();
  }

  const unlinkedAccounts = localAccounts.filter(
    account =>
      !account.account_id &&
      !Object.values(chosenAccounts).includes(account.id),
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
              border: '1px solid ' + colors.border,
            }}
          >
            <TableHeader
              headers={[
                { name: 'External account name', width: 200 },
                { name: 'Local account name', width: 'flex' },
                { name: 'Actions', width: 'flex' },
              ]}
            />

            <Table
              items={externalAccounts}
              style={{ backgroundColor: colors.n11 }}
              getItemKey={index => index}
              renderItem={({ key, item }) => (
                <View key={key}>
                  <TableRow
                    externalAccount={item}
                    linkedAccount={localAccounts.find(
                      acc => acc.account_id === item.account_id,
                    )}
                    chosenAccount={
                      chosenAccounts[item.account_id] === addAccountOption.value
                        ? {
                            id: addAccountOption.value,
                            name: addAccountOption.label,
                          }
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
              primary
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
  linkedAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}) {
  const [focusedField, setFocusedField] = useState(null);

  const chosenAccountOption = chosenAccount && {
    value: chosenAccount.id,
    label: chosenAccount.name,
  };

  const availableAccountOptions = [
    ...unlinkedAccounts.map(acct => ({
      value: acct.id,
      label: acct.name,
    })),
    chosenAccount?.id !== addAccountOption.value && chosenAccountOption,
    addAccountOption,
  ].filter(Boolean);

  return (
    <Row style={{ backgroundColor: 'white' }}>
      <Field width={200}>{externalAccount.name}</Field>
      <Field
        width="flex"
        truncate={focusedField !== 'account'}
        onClick={() => !linkedAccount && setFocusedField('account')}
      >
        {focusedField === 'account' ? (
          <Autocomplete
            autoFocus
            options={availableAccountOptions}
            onSelect={value => {
              onSetLinkedAccount(externalAccount, value);
            }}
            onBlur={() => setFocusedField(null)}
            value={chosenAccountOption}
          />
        ) : (
          linkedAccount?.name || chosenAccount?.name
        )}
      </Field>
      <Field width="flex">
        {!linkedAccount &&
          (chosenAccount ? (
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
              primary
              onClick={() => {
                setFocusedField('account');
              }}
              style={{ float: 'right' }}
            >
              Setup bank-sync
            </Button>
          ))}
      </Field>
    </Row>
  );
}
