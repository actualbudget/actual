import React, { useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import {
  type AccountEntity,
  type SyncServerGoCardlessAccount,
  type SyncServerPluggyAiAccount,
  type SyncServerSimpleFinAccount,
} from 'loot-core/types/models';

import {
  linkAccount,
  linkAccountPluggyAi,
  linkAccountSimpleFin,
  unlinkAccount,
} from '@desktop-client/accounts/accountsSlice';
import {
  Autocomplete,
  type AutocompleteItem,
} from '@desktop-client/components/autocomplete/Autocomplete';
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
  Cell,
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

export type SelectLinkedAccountsModalProps =
  | {
      requisitionId: string;
      externalAccounts: SyncServerGoCardlessAccount[];
      syncSource: 'goCardless';
    }
  | {
      requisitionId?: undefined;
      externalAccounts: SyncServerSimpleFinAccount[];
      syncSource: 'simpleFin';
    }
  | {
      requisitionId?: undefined;
      externalAccounts: SyncServerPluggyAiAccount[];
      syncSource: 'pluggyai';
    };

export function SelectLinkedAccountsModal({
  requisitionId = undefined,
  externalAccounts,
  syncSource,
}: SelectLinkedAccountsModalProps) {
  const propsWithSortedExternalAccounts =
    useMemo<SelectLinkedAccountsModalProps>(() => {
      const toSort = externalAccounts ? [...externalAccounts] : [];
      toSort.sort(
        (a, b) =>
          getInstitutionName(a)?.localeCompare(getInstitutionName(b)) ||
          a.name.localeCompare(b.name),
      );
      switch (syncSource) {
        case 'simpleFin':
          return {
            syncSource: 'simpleFin',
            externalAccounts: toSort as SyncServerSimpleFinAccount[],
          };
        case 'pluggyai':
          return {
            syncSource: 'pluggyai',
            externalAccounts: toSort as SyncServerPluggyAiAccount[],
          };
        case 'goCardless':
          return {
            syncSource: 'goCardless',
            requisitionId: requisitionId!,
            externalAccounts: toSort as SyncServerGoCardlessAccount[],
          };
      }
    }, [externalAccounts, syncSource, requisitionId]);

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const localAccounts = useAccounts().filter(a => a.closed === 0);
  const [chosenAccounts, setChosenAccounts] = useState<Record<string, string>>(
    () => {
      return Object.fromEntries(
        localAccounts
          .filter(acc => acc.account_id)
          .map(acc => [acc.account_id, acc.id]),
      );
    },
  );
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
        const externalAccountIndex =
          propsWithSortedExternalAccounts.externalAccounts.findIndex(
            account => account.account_id === chosenExternalAccountId,
          );
        const offBudget = chosenLocalAccountId === addOffBudgetAccountOption.id;

        // Skip linking accounts that were previously linked with
        // a different bank.
        if (externalAccountIndex === -1) {
          return;
        }

        // Finally link the matched account
        if (propsWithSortedExternalAccounts.syncSource === 'simpleFin') {
          dispatch(
            linkAccountSimpleFin({
              externalAccount:
                propsWithSortedExternalAccounts.externalAccounts[
                  externalAccountIndex
                ],
              upgradingId:
                chosenLocalAccountId !== addOnBudgetAccountOption.id &&
                chosenLocalAccountId !== addOffBudgetAccountOption.id
                  ? chosenLocalAccountId
                  : undefined,
              offBudget,
            }),
          );
        } else if (propsWithSortedExternalAccounts.syncSource === 'pluggyai') {
          dispatch(
            linkAccountPluggyAi({
              externalAccount:
                propsWithSortedExternalAccounts.externalAccounts[
                  externalAccountIndex
                ],
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
              requisitionId: propsWithSortedExternalAccounts.requisitionId,
              account:
                propsWithSortedExternalAccounts.externalAccounts[
                  externalAccountIndex
                ],
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

  function onSetLinkedAccount(
    externalAccount:
      | SyncServerGoCardlessAccount
      | SyncServerSimpleFinAccount
      | SyncServerPluggyAiAccount,
    localAccountId: string | null | undefined,
  ) {
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
            <TableHeader>
              <Cell name={t('Institution to Sync')} width={175} />
              <Cell name={t('Bank Account To Sync')} width={175} />
              <Cell name={t('Balance')} width={80} />
              <Cell name={t('Account in Actual')} width="flex" />
              <Cell name={t('Actions')} width={150} />
            </TableHeader>

            <Table<
              SelectLinkedAccountsModalProps['externalAccounts'][number] & {
                id: string;
              }
            >
              items={propsWithSortedExternalAccounts.externalAccounts.map(
                account => ({
                  ...account,
                  id: account.account_id,
                }),
              )}
              style={{ backgroundColor: theme.tableHeaderBackground }}
              getItemKey={String}
              renderItem={({ item }) => (
                <View key={item.id}>
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

function getInstitutionName(
  externalAccount:
    | SyncServerGoCardlessAccount
    | SyncServerSimpleFinAccount
    | SyncServerPluggyAiAccount,
) {
  if (typeof externalAccount?.institution === 'string') {
    return externalAccount?.institution ?? '';
  } else if (typeof externalAccount.institution?.name === 'string') {
    return externalAccount?.institution?.name ?? '';
  }
  return '';
}

type TableRowProps = {
  externalAccount:
    | SyncServerGoCardlessAccount
    | SyncServerSimpleFinAccount
    | SyncServerPluggyAiAccount;
  chosenAccount: { id: string; name: string } | undefined;
  unlinkedAccounts: AccountEntity[];
  onSetLinkedAccount: (
    externalAccount:
      | SyncServerGoCardlessAccount
      | SyncServerSimpleFinAccount
      | SyncServerPluggyAiAccount,
    localAccountId: string | null | undefined,
  ) => void;
};

function TableRow({
  externalAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}: TableRowProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { addOnBudgetAccountOption, addOffBudgetAccountOption } =
    useAddBudgetAccountOptions();

  const availableAccountOptions: AutocompleteItem[] = [...unlinkedAccounts];
  if (chosenAccount && chosenAccount.id !== addOnBudgetAccountOption.id) {
    availableAccountOptions.push(chosenAccount);
  }
  availableAccountOptions.push(
    addOnBudgetAccountOption,
    addOffBudgetAccountOption,
  );

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
