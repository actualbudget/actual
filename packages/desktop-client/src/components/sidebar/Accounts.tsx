import { useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import { useMoveAccountMutation } from '#accounts';
import { isAccountFailedSync } from '#accounts/syncStatus';
import { useAccounts } from '#hooks/useAccounts';
import { useClosedAccounts } from '#hooks/useClosedAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useOffBudgetAccounts } from '#hooks/useOffBudgetAccounts';
import { useOnBudgetAccounts } from '#hooks/useOnBudgetAccounts';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useUpdatedAccounts } from '#hooks/useUpdatedAccounts';
import { useSelector } from '#redux';
import * as bindings from '#spreadsheet/bindings';

import { Account } from './Account';
import { SecondaryItem } from './SecondaryItem';

const fontWeight = 600;
type AccountsGroupBy = 'currency' | 'account-type';

export function Accounts() {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const { data: accounts = [] } = useAccounts();
  const updatedAccounts = useUpdatedAccounts();
  const { data: offbudgetAccounts = [] } = useOffBudgetAccounts();
  const { data: onBudgetAccounts = [] } = useOnBudgetAccounts();
  const { data: closedAccounts = [] } = useClosedAccounts();
  const [defaultCurrencyCode] = useSyncedPref('defaultCurrencyCode');
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);

  const getAccountPath = (account: AccountEntity) => `/accounts/${account.id}`;

  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );
  const [accountsGroupByPref, setAccountsGroupByPref] =
    useLocalPref('ui.accountsGroupBy');
  const [collapsedCurrencyGroups = {}, setCollapsedCurrencyGroups] =
    useLocalPref('ui.collapsedCurrencyGroups');
  const accountsGroupBy: AccountsGroupBy = accountsGroupByPref ?? 'currency';

  function onDragChange(drag: { state: string }) {
    setIsDragging(drag.state === 'start');
  }

  const moveAccount = useMoveAccountMutation();

  const makeDropPadding = (i: number) => {
    if (i === 0) {
      return {
        paddingTop: isDragging ? 15 : 0,
        marginTop: isDragging ? -15 : 0,
      };
    }
    return undefined;
  };

  async function onReorder(
    id: string,
    dropPos: 'top' | 'bottom' | null,
    targetId: string,
  ) {
    let targetIdToMove: string | null = targetId;
    if (dropPos === 'bottom') {
      const idx = accounts.findIndex(a => a.id === targetId) + 1;
      targetIdToMove = idx < accounts.length ? accounts[idx].id : null;
    }

    moveAccount.mutate({ id, targetId: targetIdToMove });
  }

  const onToggleClosedAccounts = () => {
    setShowClosedAccountsPref(!showClosedAccounts);
  };

  const onToggleCurrencyGroup = (currency: string) => {
    setCollapsedCurrencyGroups({
      ...collapsedCurrencyGroups,
      [currency]: !collapsedCurrencyGroups[currency],
    });
  };

  const getAccountCurrency = (account: AccountEntity) =>
    account.currency || defaultCurrencyCode || 'USD';
  const baseCurrency = defaultCurrencyCode || 'USD';

  const accountCurrencies = Array.from(
    new Set(
      accounts.filter(account => !account.closed).map(getAccountCurrency),
    ),
  ).sort();

  const renderAccount = (
    account: AccountEntity,
    i: number,
    displayName?: ReactNode,
  ) => {
    const accountCurrency = getAccountCurrency(account);
    return (
      <Account
        key={account.id}
        name={account.name}
        displayName={displayName}
        account={account}
        connected={!!account.bank}
        pending={syncingAccountIds.includes(account.id)}
        failed={isAccountFailedSync(account)}
        updated={updatedAccounts.includes(account.id)}
        to={getAccountPath(account)}
        query={bindings.accountBalance(account.id)}
        baseAmountQuery={bindings.accountBaseBalance(account.id)}
        baseCurrency={baseCurrency}
        nativeCurrency={accountCurrency}
        showBaseAmountTooltip
        onDragChange={onDragChange}
        onDrop={onReorder}
        outerStyle={makeDropPadding(i)}
      />
    );
  };

  return (
    <View
      style={{
        flexGrow: 1,
        '@media screen and (max-height: 480px)': {
          minHeight: 'auto',
        },
      }}
    >
      <View
        style={{
          height: 1,
          backgroundColor: theme.sidebarItemBackgroundHover,
          marginTop: 15,
          flexShrink: 0,
        }}
      />

      <View style={{ overflow: 'auto' }}>
        <Account
          name={t('All accounts')}
          to="/accounts"
          query={bindings.allAccountBalance()}
          baseAmountQuery={bindings.allAccountBalance()}
          baseCurrency={baseCurrency}
          nativeCurrency={baseCurrency}
          showBaseAmountTooltip
          style={{ fontWeight, marginTop: 15 }}
          isExactPathMatch
          balanceTestId="sidebar-all-accounts-balance"
        />

        <View style={{ marginTop: 13, paddingLeft: 10, paddingRight: 15 }}>
          <Select
            bare
            value={accountsGroupBy}
            onChange={value => setAccountsGroupByPref(value as AccountsGroupBy)}
            options={[
              ['currency', t('Currency')],
              ['account-type', t('Account Type')],
            ]}
            style={{
              color: theme.pageTextPositive,
              padding: 0,
              height: 'auto',
              minHeight: 0,
              fontSize: 13,
              fontWeight: 600,
            }}
          />
        </View>

        {accountsGroupBy === 'currency'
          ? accountCurrencies.map(currency => {
              const currencyOnBudgetAccounts = onBudgetAccounts.filter(
                account => getAccountCurrency(account) === currency,
              );
              const currencyOffBudgetAccounts = offbudgetAccounts.filter(
                account => getAccountCurrency(account) === currency,
              );
              const isCurrencyCollapsed = !!collapsedCurrencyGroups[currency];
              const CurrencyIcon = isCurrencyCollapsed
                ? SvgCheveronRight
                : SvgCheveronDown;

              return (
                <View key={currency}>
                  <SecondaryItem
                    style={{ marginTop: 13 }}
                    title={currency}
                    Icon={CurrencyIcon}
                    onClick={() => onToggleCurrencyGroup(currency)}
                    bold
                  />

                  {!isCurrencyCollapsed && (
                    <>
                      {currencyOnBudgetAccounts.length > 0 && (
                        <Account
                          name={t('On budget')}
                          to={`/accounts/onbudget?currency=${encodeURIComponent(currency)}`}
                          query={bindings.onBudgetAccountBalanceForCurrency(
                            currency,
                          )}
                          baseAmountQuery={bindings.onBudgetAccountBaseBalanceForCurrency(
                            currency,
                          )}
                          baseCurrency={baseCurrency}
                          nativeCurrency={currency}
                          showBaseAmountTooltip
                          style={{
                            fontWeight,
                            marginTop: 5,
                            marginBottom: 5,
                          }}
                          titleAccount
                          balanceTestId="sidebar-on-budget-balance"
                        />
                      )}

                      {currencyOnBudgetAccounts.map((account, index) =>
                        renderAccount(account, index),
                      )}

                      {currencyOffBudgetAccounts.length > 0 && (
                        <Account
                          name={t('Off budget')}
                          to={`/accounts/offbudget?currency=${encodeURIComponent(currency)}`}
                          query={bindings.offBudgetAccountBalanceForCurrency(
                            currency,
                          )}
                          baseAmountQuery={bindings.offBudgetAccountBaseBalanceForCurrency(
                            currency,
                          )}
                          baseCurrency={baseCurrency}
                          nativeCurrency={currency}
                          showBaseAmountTooltip
                          style={{
                            fontWeight,
                            marginTop: 13,
                            marginBottom: 5,
                          }}
                          titleAccount
                          balanceTestId="sidebar-off-budget-balance"
                        />
                      )}

                      {currencyOffBudgetAccounts.map((account, index) =>
                        renderAccount(account, index),
                      )}
                    </>
                  )}
                </View>
              );
            })
          : [
              {
                key: 'onbudget',
                title: t('On budget'),
                to: '/accounts/onbudget',
                query: bindings.onBudgetAccountBalance(),
                accounts: onBudgetAccounts,
                balanceTestId: 'sidebar-on-budget-balance',
              },
              {
                key: 'offbudget',
                title: t('Off budget'),
                to: '/accounts/offbudget',
                query: bindings.offBudgetAccountBalance(),
                accounts: offbudgetAccounts,
                balanceTestId: 'sidebar-off-budget-balance',
              },
            ].map(group =>
              group.accounts.length > 0 ? (
                <View key={group.key}>
                  <Account
                    name={group.title}
                    to={group.to}
                    query={group.query}
                    baseAmountQuery={group.query}
                    baseCurrency={baseCurrency}
                    nativeCurrency={baseCurrency}
                    showBaseAmountTooltip
                    style={{
                      fontWeight,
                      marginTop: 13,
                      marginBottom: 5,
                    }}
                    titleAccount
                    balanceTestId={group.balanceTestId}
                  />
                  {group.accounts.map((account, index) =>
                    renderAccount(
                      account,
                      index,
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'baseline',
                          minWidth: 0,
                        }}
                      >
                        <Text
                          as="small"
                          style={{
                            color: theme.pageTextPositive,
                            fontSize: 10,
                            fontWeight: 700,
                            marginRight: 5,
                            flexShrink: 0,
                          }}
                        >
                          {getAccountCurrency(account)}
                        </Text>
                        <Text
                          style={{
                            color: 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {account.name}
                        </Text>
                      </View>,
                    ),
                  )}
                </View>
              ) : null,
            )}

        {closedAccounts.length > 0 && (
          <SecondaryItem
            style={{ marginTop: 15 }}
            title={
              showClosedAccounts
                ? t('Closed accounts')
                : t('Closed accounts...')
            }
            onClick={onToggleClosedAccounts}
            bold
          />
        )}

        {showClosedAccounts &&
          closedAccounts.map(account => {
            const accountCurrency = getAccountCurrency(account);
            return (
              <Account
                key={account.id}
                name={account.name}
                account={account}
                to={getAccountPath(account)}
                query={bindings.accountBalance(account.id)}
                baseAmountQuery={bindings.accountBaseBalance(account.id)}
                baseCurrency={baseCurrency}
                nativeCurrency={accountCurrency}
                showBaseAmountTooltip
                onDragChange={onDragChange}
                onDrop={onReorder}
              />
            );
          })}
      </View>
    </View>
  );
}
