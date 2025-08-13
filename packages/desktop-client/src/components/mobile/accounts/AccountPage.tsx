import React, { Fragment, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { type CSSProperties, styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type AccountEntity } from 'loot-core/types/models';

import { AccountTransactions } from './AccountTransactions';
import { AllAccountTransactions } from './AllAccountTransactions';
import { OffBudgetAccountTransactions } from './OffBudgetAccountTransactions';
import { OnBudgetAccountTransactions } from './OnBudgetAccountTransactions';

import { MobileBackButton } from '@desktop-client/components/mobile/MobileBackButton';
import { AddTransactionButton } from '@desktop-client/components/mobile/transactions/AddTransactionButton';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import { useAccount } from '@desktop-client/hooks/useAccount';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import {
  openAccountCloseModal,
  pushModal,
} from '@desktop-client/modals/modalsSlice';
import {
  reopenAccount,
  updateAccount,
} from '@desktop-client/queries/queriesSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';

export function AccountPage() {
  const { t } = useTranslation();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const { id: accountIdParam } = useParams();

  const account = useAccount(accountIdParam || '');

  const nameFromId = useCallback((id: string | undefined) => {
    switch (id) {
      case 'onbudget':
        return t('On Budget Accounts');
      case 'offbudget':
        return t('Off Budget Accounts');
      case 'uncategorized':
        return t('Uncategorized');
      case 'closed':
        return t('Closed Accounts');
      default:
        return t('All Accounts');
    }
  }, [t]);

  return (
    <Page
      header={
        <MobilePageHeader
          title={
            account ? (
              <AccountHeader account={account} />
            ) : (
              <NameOnlyHeader name={nameFromId(accountIdParam)} />
            )
          }
          leftContent={<MobileBackButton />}
          rightContent={<AddTransactionButton accountId={account?.id} />}
        />
      }
      padding={0}
    >
      {/* This key forces the whole table rerender when the number format changes */}
      <Fragment key={numberFormat + hideFraction}>
        {account ? (
          <AccountTransactions account={account} />
        ) : accountIdParam === 'onbudget' ? (
          <OnBudgetAccountTransactions />
        ) : accountIdParam === 'offbudget' ? (
          <OffBudgetAccountTransactions />
        ) : (
          <AllAccountTransactions />
        )}
      </Fragment>
    </Page>
  );
}

function AccountHeader({ account }: { readonly account: AccountEntity }) {
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const pending = useMemo(
    () => syncingAccountIds.includes(account.id),
    [syncingAccountIds, account.id],
  );
  const failed = useMemo(
    () => failedAccounts.has(account.id),
    [failedAccounts, account.id],
  );

  const dispatch = useDispatch();

  const onSave = useCallback(
    (account: AccountEntity) => {
      dispatch(updateAccount({ account }));
    },
    [dispatch],
  );

  const onSaveNotes = useCallback(async (id: string, notes: string) => {
    await send('notes-save', { id, note: notes });
  }, []);

  const onEditNotes = useCallback(
    (id: string) => {
      dispatch(
        pushModal({
          modal: {
            name: 'notes',
            options: {
              id: `account-${id}`,
              name: account.name,
              onSave: onSaveNotes,
            },
          },
        }),
      );
    },
    [account.name, dispatch, onSaveNotes],
  );

  const onCloseAccount = useCallback(() => {
    dispatch(openAccountCloseModal({ accountId: account.id }));
  }, [account.id, dispatch]);

  const onReopenAccount = useCallback(() => {
    dispatch(reopenAccount({ id: account.id }));
  }, [account.id, dispatch]);

  const onClick = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'account-menu',
          options: {
            accountId: account.id,
            onSave,
            onEditNotes,
            onCloseAccount,
            onReopenAccount,
          },
        },
      }),
    );
  }, [
    account.id,
    dispatch,
    onCloseAccount,
    onEditNotes,
    onReopenAccount,
    onSave,
  ]);

  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      {account.bank && (
        <View
          style={{
            margin: 'auto',
            marginRight: 5,
            width: 8,
            height: 8,
            borderRadius: 8,
            flexShrink: 0,
            backgroundColor: pending
              ? theme.sidebarItemBackgroundPending
              : failed
                ? theme.sidebarItemBackgroundFailed
                : theme.sidebarItemBackgroundPositive,
            transition: 'transform .3s',
          }}
        />
      )}
      <Button variant="bare" onPress={onClick}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: 500,
            ...styles.underlinedText,
            ...(styles.lineClamp(2) as CSSProperties),
          }}
        >
          {`${account.closed ? 'Closed: ' : ''}${account.name}`}
        </Text>
      </Button>
    </View>
  );
}

function NameOnlyHeader({ name }: { readonly name: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
      }}
    >
      <Text style={{ ...(styles.lineClamp(2) as CSSProperties) }}>{name}</Text>
    </View>
  );
}
