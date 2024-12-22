import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import {
  closeModal,
  linkAccount,
  linkAccountSimpleFin,
  unlinkAccount,
} from 'loot-core/client/actions';
import {
  type AccountEntity,
  type AccountSyncSource,
} from 'loot-core/types/models/account';

import { useAccounts } from '../../hooks/useAccounts';
import { theme } from '../../style';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { PrivacyFilter } from '../PrivacyFilter';
import { Field, Row, Table, TableHeader } from '../table';

import { type NormalizedAccount } from './CreateAccountModal';

type LinkAccountOption = {
  id: string;
  name: string;
};

const addOnBudgetAccountOption: LinkAccountOption = {
  id: 'new-on',
  name: 'Create new account',
};

const addOffBudgetAccountOption: LinkAccountOption = {
  id: 'new-off',
  name: 'Create new account (off budget)',
};

type SelectLinkedAccountsModalProps = {
  requisitionId: string;
  externalAccounts: NormalizedAccount[];
  syncSource: AccountSyncSource;
};

type LinkedAccountIds = { [key: string]: string };
type LinkedAccountIdsSetter = (
  fn: (value: LinkedAccountIds) => LinkedAccountIds,
) => void;

export function SelectLinkedAccountsModal({
  requisitionId,
  externalAccounts,
  syncSource,
}: SelectLinkedAccountsModalProps) {
  externalAccounts.sort((a, b) => a.name.localeCompare(b.name));
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const localAccounts: AccountEntity[] = useAccounts().filter(
    a => a.closed === 0,
  );
  const [chosenAccounts, setChosenAccounts]: [
    LinkedAccountIds,
    LinkedAccountIdsSetter,
  ] = useState(() => {
    return Object.fromEntries(
      localAccounts
        .filter(acc => acc.account_id)
        .map(acc => [acc.account_id, acc.id]),
    );
  });

  async function onNext() {
    const chosenLocalAccountIds: string[] = Object.values(chosenAccounts);

    // Unlink accounts that were previously linked, but the user
    // chose to remove the bank-sync
    localAccounts
      .filter(acc => acc.account_id)
      .filter(acc => !chosenLocalAccountIds.includes(acc.id))
      .forEach(acc => dispatch(unlinkAccount(acc.id)));

    // Link new accounts
    Object.entries(chosenAccounts).forEach(
      ([chosenExternalAccountId, chosenLocalAccountId]) => {
        const externalAccount = externalAccounts.find(
          account => account.id === chosenExternalAccountId,
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
            linkAccountSimpleFin(
              externalAccount,
              chosenLocalAccountId !== addOnBudgetAccountOption.id &&
                chosenLocalAccountId !== addOffBudgetAccountOption.id
                ? chosenLocalAccountId
                : undefined,
              offBudget,
            ),
          );
        } else {
          dispatch(
            linkAccount(
              requisitionId,
              externalAccount,
              chosenLocalAccountId !== addOnBudgetAccountOption.id &&
                chosenLocalAccountId !== addOffBudgetAccountOption.id
                ? chosenLocalAccountId
                : undefined,
              offBudget,
            ),
          );
        }
      },
    );

    dispatch(closeModal());
  }

  const unlinkedAccounts = localAccounts.filter(
    account => !Object.values(chosenAccounts).includes(account.id),
  );

  function onSetLinkedAccount(
    externalAccount: NormalizedAccount,
    localAccountId: string | undefined,
  ) {
    setChosenAccounts((accounts: LinkedAccountIds): LinkedAccountIds => {
      const updatedAccounts: LinkedAccountIds = { ...accounts };

      if (localAccountId !== undefined) {
        updatedAccounts[externalAccount.id] = localAccountId;
      } else {
        delete updatedAccounts[externalAccount.id];
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
            {t(
              'We found the following accounts. Select which ones you want to add:',
            )}
          </Text>
          <View
            style={{
              flex: 'unset',
              height: 300,
              border: '1px solid ' + theme.tableBorder,
            }}
          >
            <TableHeader>
              <Field width="200">
                <Trans>Bank Account To Sync</Trans>
              </Field>
              <Field width="80">
                <Trans>Balance</Trans>
              </Field>
              <Field width="flex">
                <Trans>Account in Actual</Trans>
              </Field>
              <Field width="flex">
                <Trans>Actions</Trans>
              </Field>
            </TableHeader>
            <Table
              items={externalAccounts}
              style={{ backgroundColor: theme.tableHeaderBackground }}
              getItemKey={index => externalAccounts[index].id}
              renderItem={({ item }) => (
                <View key={item.id}>
                  <TableRow
                    externalAccount={item}
                    chosenAccount={
                      chosenAccounts[item.id] === addOnBudgetAccountOption.id
                        ? addOnBudgetAccountOption
                        : chosenAccounts[item.id] ===
                            addOffBudgetAccountOption.id
                          ? addOffBudgetAccountOption
                          : localAccounts.find(
                              acc => chosenAccounts[item.id] === acc.id,
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
              {t('Link accounts')}
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}

type TableRowProps = {
  externalAccount: NormalizedAccount;
  chosenAccount: LinkAccountOption | undefined;
  unlinkedAccounts: LinkAccountOption[];
  onSetLinkedAccount: (
    account: NormalizedAccount,
    localAccountId: string | undefined,
  ) => void;
};

function TableRow({
  externalAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}: TableRowProps) {
  const { t } = useTranslation();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const availableAccountOptions: LinkAccountOption[] = [
    ...unlinkedAccounts,
    addOnBudgetAccountOption,
    addOffBudgetAccountOption,
  ].filter(Boolean);

  if (
    chosenAccount &&
    chosenAccount.id !== addOnBudgetAccountOption.id &&
    chosenAccount.id !== addOffBudgetAccountOption.id
  ) {
    availableAccountOptions.push(chosenAccount);
  }

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
            onSelect={(value: string | undefined) => {
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
              onSetLinkedAccount(externalAccount, undefined);
            }}
            style={{ float: 'right' }}
          >
            {t('Remove bank-sync')}
          </Button>
        ) : (
          <Button
            variant="primary"
            onPress={() => {
              setFocusedField('account');
            }}
            style={{ float: 'right' }}
          >
            {t('Setup bank-sync')}
          </Button>
        )}
      </Field>
    </Row>
  );
}
