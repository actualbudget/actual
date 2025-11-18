import React, { useMemo, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SpaceBetween } from '@actual-app/components/space-between';
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
import { useFormat } from '@desktop-client/hooks/useFormat';
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
  const { isNarrowWidth } = useResponsive();
  const dispatch = useDispatch();
  const localAccounts = useAccounts().filter(a => a.closed === 0);
  const [draftLinkAccounts, setDraftLinkAccounts] = useState<
    Map<string, 'linking' | 'unlinking'>
  >(new Map());
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
        setDraftLinkAccounts(prev =>
          new Map(prev).set(externalAccount.account_id, 'linking'),
        );
      } else {
        delete updatedAccounts[externalAccount.account_id];
        setDraftLinkAccounts(prev =>
          new Map(prev).set(externalAccount.account_id, 'unlinking'),
        );
      }

      return updatedAccounts;
    });
  }

  const getChosenAccount = (accountId: string) => {
    const chosenId = chosenAccounts[accountId];
    if (!chosenId) return undefined;

    if (chosenId === addOnBudgetAccountOption.id) {
      return addOnBudgetAccountOption;
    }
    if (chosenId === addOffBudgetAccountOption.id) {
      return addOffBudgetAccountOption;
    }

    return localAccounts.find(acc => acc.id === chosenId);
  };

  const label = useMemo(() => {
    const s = new Set(draftLinkAccounts.values());
    if (s.has('linking') && s.has('unlinking')) {
      return t('Link and unlink accounts');
    } else if (s.has('linking')) {
      return t('Link accounts');
    } else if (s.has('unlinking')) {
      return t('Unlink accounts');
    }

    return t('Link or unlink accounts');
  }, [draftLinkAccounts, t]);

  return (
    <Modal
      name="select-linked-accounts"
      containerProps={{
        style: isNarrowWidth
          ? {
              width: '100vw',
              maxWidth: '100vw',
              height: '100vh',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
            }
          : { width: 1000 },
      }}
    >
      {({ state: { close } }) => (
        <View
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <ModalHeader
            title={t('Link Accounts')}
            rightContent={<ModalCloseButton onPress={close} />}
          />

          <View
            style={{
              padding: isNarrowWidth ? '0 16px' : '0 20px',
              flexShrink: 0,
            }}
          >
            <Text style={{ marginBottom: 20 }}>
              <Trans>
                We found the following accounts. Select which ones you want to
                add:
              </Trans>
            </Text>
          </View>

          {isNarrowWidth ? (
            <View
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {propsWithSortedExternalAccounts.externalAccounts.map(account => (
                <AccountCard
                  key={account.account_id}
                  externalAccount={account}
                  chosenAccount={getChosenAccount(account.account_id)}
                  unlinkedAccounts={unlinkedAccounts}
                  onSetLinkedAccount={onSetLinkedAccount}
                />
              ))}
            </View>
          ) : (
            <View
              style={{
                flex: 'unset',
                height: 300,
                border: '1px solid ' + theme.tableBorder,
              }}
            >
              <TableHeader>
                <Cell value={t('Institution to Sync')} width={175} />
                <Cell value={t('Bank Account To Sync')} width={175} />
                <Cell value={t('Balance')} width={80} />
                <Cell value={t('Account in Actual')} width="flex" />
                <Cell value={t('Actions')} width={150} />
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
                renderItem={({ item }) => (
                  <View key={item.id}>
                    <TableRow
                      externalAccount={item}
                      chosenAccount={getChosenAccount(item.account_id)}
                      unlinkedAccounts={unlinkedAccounts}
                      onSetLinkedAccount={onSetLinkedAccount}
                    />
                  </View>
                )}
              />
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              justifyContent: isNarrowWidth ? 'center' : 'flex-end',
              ...(isNarrowWidth
                ? {
                    padding: '16px',
                    flexShrink: 0,
                    borderTop: `1px solid ${theme.tableBorder}`,
                  }
                : { marginTop: 10 }),
            }}
          >
            <Button
              variant="primary"
              onPress={onNext}
              isDisabled={draftLinkAccounts.size === 0}
              style={
                isNarrowWidth
                  ? {
                      width: '100%',
                      height: '44px',
                      fontSize: '1em',
                    }
                  : undefined
              }
            >
              {label}
            </Button>
          </View>
        </View>
      )}
    </Modal>
  );
}

type ExternalAccount =
  | SyncServerGoCardlessAccount
  | SyncServerSimpleFinAccount
  | SyncServerPluggyAiAccount;

type SharedAccountRowProps = {
  externalAccount: ExternalAccount;
  chosenAccount: { id: string; name: string } | undefined;
  unlinkedAccounts: AccountEntity[];
  onSetLinkedAccount: (
    externalAccount: ExternalAccount,
    localAccountId: string | null | undefined,
  ) => void;
};

function getAvailableAccountOptions(
  unlinkedAccounts: AccountEntity[],
  chosenAccount: { id: string; name: string } | undefined,
  addOnBudgetAccountOption: { id: string; name: string },
  addOffBudgetAccountOption: { id: string; name: string },
): AutocompleteItem[] {
  const options: AutocompleteItem[] = [...unlinkedAccounts];
  if (
    chosenAccount &&
    chosenAccount.id !== addOnBudgetAccountOption.id &&
    chosenAccount.id !== addOffBudgetAccountOption.id
  ) {
    options.push(chosenAccount);
  }
  options.push(addOnBudgetAccountOption, addOffBudgetAccountOption);
  return options;
}

type TableRowProps = SharedAccountRowProps;

function TableRow({
  externalAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}: TableRowProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { addOnBudgetAccountOption, addOffBudgetAccountOption } =
    useAddBudgetAccountOptions();
  const format = useFormat();
  const { t } = useTranslation();

  const availableAccountOptions = getAvailableAccountOptions(
    unlinkedAccounts,
    chosenAccount,
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
        <PrivacyFilter>
          {externalAccount.balance != null
            ? format(externalAccount.balance.toString(), 'financial')
            : t('Unknown')}
        </PrivacyFilter>
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

type AccountCardProps = SharedAccountRowProps;

function AccountCard({
  externalAccount,
  chosenAccount,
  unlinkedAccounts,
  onSetLinkedAccount,
}: AccountCardProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { addOnBudgetAccountOption, addOffBudgetAccountOption } =
    useAddBudgetAccountOptions();
  const format = useFormat();
  const { t } = useTranslation();

  const availableAccountOptions = getAvailableAccountOptions(
    unlinkedAccounts,
    chosenAccount,
    addOnBudgetAccountOption,
    addOffBudgetAccountOption,
  );

  return (
    <SpaceBetween
      direction="vertical"
      gap={10}
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 8,
        padding: '12px 16px',
        border: `1px solid ${theme.tableBorder}`,
        minHeight: 'fit-content',
        alignItems: 'stretch',
      }}
    >
      <View
        style={{
          fontWeight: 600,
          fontSize: '1.1em',
          color: theme.pageText,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {externalAccount.name}
      </View>

      <View
        style={{
          fontSize: '0.9em',
          color: theme.pageTextSubdued,
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {getInstitutionName(externalAccount)}
      </View>

      <View
        style={{
          fontSize: '0.9em',
          color: theme.pageTextSubdued,
        }}
      >
        <Trans>Balance:</Trans>{' '}
        <PrivacyFilter>
          {externalAccount.balance != null
            ? format(externalAccount.balance.toString(), 'financial')
            : t('Unknown')}
        </PrivacyFilter>
      </View>

      <SpaceBetween
        direction="horizontal"
        gap={5}
        style={{
          fontSize: '0.9em',
          color: theme.pageTextSubdued,
        }}
      >
        <Text>
          <Trans>Linked to:</Trans>
        </Text>
        {chosenAccount ? (
          <Text style={{ color: theme.noticeTextLight, fontWeight: 500 }}>
            {chosenAccount.name}
          </Text>
        ) : (
          <Text style={{ color: theme.pageTextSubdued }}>
            <Trans>Not linked</Trans>
          </Text>
        )}
      </SpaceBetween>

      {focusedField === 'account' && (
        <View style={{ marginBottom: 12 }}>
          <Autocomplete
            focused
            strict
            highlightFirst
            suggestions={availableAccountOptions}
            onSelect={value => {
              onSetLinkedAccount(externalAccount, value);
              setFocusedField(null);
            }}
            inputProps={{
              onBlur: () => setFocusedField(null),
              placeholder: t('Select account...'),
            }}
            value={chosenAccount?.id}
          />
        </View>
      )}

      {chosenAccount ? (
        <Button
          onPress={() => {
            onSetLinkedAccount(externalAccount, null);
          }}
          style={{
            padding: '8px 16px',
            fontSize: '0.9em',
            width: '100%',
          }}
        >
          <Trans>Remove bank sync</Trans>
        </Button>
      ) : (
        <Button
          variant="primary"
          onPress={() => {
            setFocusedField('account');
          }}
          style={{
            padding: '8px 16px',
            fontSize: '0.9em',
            width: '100%',
          }}
        >
          <Trans>Link account</Trans>
        </Button>
      )}
    </SpaceBetween>
  );
}
