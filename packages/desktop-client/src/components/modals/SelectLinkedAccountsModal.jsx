import React, { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import {
  linkAccount,
  linkAccountSimpleFin,
  unlinkAccount,
} from 'loot-core/client/accounts/accountsSlice';
import { closeModal } from 'loot-core/client/modals/modalsSlice';

import { useAccounts } from '../../hooks/useAccounts';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { TableHeader, Table, Row, Field } from '../table';

function useAddBudgetAccountOptions() {
  const { t } = useTranslation();

  const addOnBudgetAccountOption = {
    id: 'new-on',
    name: t('Create new account'),
  };
  const addOffBudgetAccountOption = {
    id: 'new-off',
    name: t('Create new account (off budget)'),
  };

  return { addOnBudgetAccountOption, addOffBudgetAccountOption };
}

export function SelectLinkedAccountsModal({
  requisitionId = undefined,
  externalAccounts,
  syncSource = undefined,
}) {
  externalAccounts.sort((a, b) => a.name.localeCompare(b.name));
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const localAccounts = useAccounts().filter(a => a.closed === 0);
  const [chosenAccounts, setChosenAccounts] = useState(() => {
    return Object.fromEntries(
      localAccounts
        .filter(acc => acc.account_id)
        .map(acc => [acc.account_id, acc.id]),
    );
  });
  const { addOnBudgetAccountOption, addOffBudgetAccountOption } =
    useAddBudgetAccountOptions();

  async function onNext() {
    const chosenLocalAccountIds = Object.values(chosenAccounts);

    // Unlink accounts that were previously linked, but the user
    // chose to remove the bank-sync
    localAccounts
      .filter(acc => acc.account_id)
      .filter(acc => !chosenLocalAccountIds.includes(acc.id))
      .forEach(acc => dispatch(unlinkAccount({ id: acc.id })));

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
          dispatch(
            linkAccountSimpleFin({
              externalAccount,
              upgradingId:
                chosenLocalAccountId !== addOnBudgetAccountOption.id &&
                chosenLocalAccountId !== addOffBudgetAccountOption.id
                  ? chosenLocalAccountId
                  : undefined,
              offBudget,
            }),
          );
        } else {
          dispatch(
            linkAccount({
              requisitionId,
              account: externalAccount,
              upgradingId:
                chosenLocalAccountId !== addOnBudgetAccountOption.id &&
                chosenLocalAccountId !== addOffBudgetAccountOption.id
                  ? chosenLocalAccountId
                  : undefined,
              offBudget,
            }),
          );
        }
      },
    );

    dispatch(closeModal());
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
    <Modal
      name="select-linked-accounts"
      containerProps={{ style: { width: 800 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Link Accounts')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Text style={{ marginBottom: 10 }}>
            <Trans>
              We found the following accounts. Select which ones you want to
              add:
            </Trans>
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
                { name: t('Bank Account To Sync'), width: 200 },
                { name: t('Balance'), width: 80 },
                { name: t('Account in Actual'), width: 'flex' },
                { name: t('Actions'), width: 'flex' },
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
              variant="primary"
              onPress={onNext}
              isDisabled={!Object.keys(chosenAccounts).length}
            >
              <Trans>Link accounts</Trans>
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
  const { addOnBudgetAccountOption, addOffBudgetAccountOption } =
    useAddBudgetAccountOptions();

  const availableAccountOptions = [
    ...unlinkedAccounts,
    chosenAccount?.id !== addOnBudgetAccountOption.id && chosenAccount,
    addOnBudgetAccountOption,
    addOffBudgetAccountOption,
  ].filter(Boolean);

  return (
    <Row style={{ backgroundColor: theme.tableBackground }}>
      <Field width={200}>{externalAccount.name}</Field>
      <Field width={80}>
        <PrivacyFilter>{externalAccount.balance}</PrivacyFilter>
      </Field>
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
            onPress={() => {
              onSetLinkedAccount(externalAccount, null);
            }}
            style={{ float: 'right' }}
          >
            <Trans>Remove bank-sync</Trans>
          </Button>
        ) : (
          <Button
            variant="primary"
            onPress={() => {
              setFocusedField('account');
            }}
            style={{ float: 'right' }}
          >
            <Trans>Set up bank-sync</Trans>
          </Button>
        )}
      </Field>
    </Row>
  );
}
