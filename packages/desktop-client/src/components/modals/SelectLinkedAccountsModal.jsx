import React, { useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import {
  linkAccount,
  linkAccountPluggyAi,
  linkAccountSimpleFin,
  unlinkAccount,
} from '@desktop-client/accounts/accountsSlice';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import {
  TableHeader,
  Table,
  Row,
  Field,
} from '@desktop-client/components/table';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { closeModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

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
  const sortedExternalAccounts = useMemo(() => {
    const toSort = externalAccounts ? [...externalAccounts] : [];
    toSort.sort(
      (a, b) =>
        getInstitutionName(a)?.localeCompare(getInstitutionName(b)) ||
        a.name.localeCompare(b.name),
    );
    return toSort;
  }, [externalAccounts]);

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
        const externalAccount = sortedExternalAccounts.find(
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
        } else if (syncSource === 'pluggyai') {
          dispatch(
            linkAccountPluggyAi({
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
      containerProps={{ style: { width: 1000 } }}
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
                { name: t('Institution to Sync'), width: 175 },
                { name: t('Bank Account To Sync'), width: 175 },
                { name: t('Balance'), width: 80 },
                { name: t('Account in Actual'), width: 'flex' },
                { name: t('Actions'), width: 150 },
              ]}
            />

            <Table
              items={sortedExternalAccounts}
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

function getInstitutionName(externalAccount) {
  if (typeof externalAccount?.institution === 'string') {
    return externalAccount?.institution ?? '';
  } else if (typeof externalAccount.institution?.name === 'string') {
    return externalAccount?.institution?.name ?? '';
  }
  return '';
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
      <Field width={175}>
        <Tooltip content={getInstitutionName(externalAccount)}>
          <View
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              display: 'block',
            }}
          >
            {getInstitutionName(externalAccount)}
          </View>
        </Tooltip>
      </Field>
      <Field width={175}>
        <Tooltip content={externalAccount.name}>
          <View
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              display: 'block',
            }}
          >
            {externalAccount.name}
          </View>
        </Tooltip>
      </Field>
      <Field width={80}>
        <PrivacyFilter>{externalAccount.balance}</PrivacyFilter>
      </Field>
      <Field
        width="flex"
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
      <Field width={150}>
        {chosenAccount ? (
          <Button
            onPress={() => {
              onSetLinkedAccount(externalAccount, null);
            }}
            style={{ float: 'right' }}
          >
            <Trans>Remove bank sync</Trans>
          </Button>
        ) : (
          <Button
            variant="primary"
            onPress={() => {
              setFocusedField('account');
            }}
            style={{ float: 'right' }}
          >
            <Trans>Set up bank sync</Trans>
          </Button>
        )}
      </Field>
    </Row>
  );
}
