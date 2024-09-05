import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { css } from 'glamor';

import { replaceModal, syncAndDownload } from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';

import { useAccounts } from '../../../hooks/useAccounts';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSetThemeColor } from '../../../hooks/useSetThemeColor';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgAdd } from '../../../icons/v1';
import { theme, styles } from '../../../style';
import { makeAmountFullStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { TextOneLine } from '../../common/TextOneLine';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { CellValue } from '../../spreadsheet/CellValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

function AccountHeader({ name, amount, style = {} }) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginTop: 10,
        marginRight: 10,
        color: theme.pageTextLight,
        width: '100%',
        ...style,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            ...styles.text,
            fontSize: 14,
          }}
          data-testid="name"
        >
          {name}
        </Text>
      </View>
      <CellValue
        binding={amount}
        style={{ ...styles.text, fontSize: 14 }}
        type="financial"
      />
    </View>
  );
}

function AccountCard({
  account,
  updated,
  connected,
  pending,
  failed,
  getBalanceQuery,
  onSelect,
}) {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.tableBackground,
        boxShadow: `0 1px 1px ${theme.mobileAccountShadow}`,
        borderRadius: 6,
        marginTop: 10,
        marginRight: 10,
        width: '100%',
      }}
      data-testid="account"
    >
      <Button
        onPress={() => onSelect(account.id)}
        className={String(
          css({
            flexDirection: 'row',
            border: '1px solid ' + theme.pillBorder,
            flex: 1,
            alignItems: 'center',
          }),
        )}
      >
        <View
          style={{
            flex: 1,
            margin: '10px 0',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {account.bankId && (
              <View
                style={{
                  backgroundColor: pending
                    ? theme.sidebarItemBackgroundPending
                    : failed
                      ? theme.sidebarItemBackgroundFailed
                      : theme.sidebarItemBackgroundPositive,
                  marginRight: '8px',
                  width: 8,
                  flexShrink: 0,
                  height: 8,
                  borderRadius: 8,
                  opacity: connected ? 1 : 0,
                }}
              />
            )}
            <TextOneLine
              style={{
                ...styles.text,
                fontSize: 17,
                fontWeight: 600,
                color: updated ? theme.mobileAccountText : theme.pillText,
                paddingRight: 30,
              }}
              data-testid="account-name"
            >
              {account.name}
            </TextOneLine>
          </View>
        </View>
        <CellValue
          binding={getBalanceQuery(account)}
          type="financial"
          style={{ fontSize: 16, color: 'inherit' }}
          getStyle={makeAmountFullStyle}
          data-testid="account-balance"
        />
      </Button>
    </View>
  );
}

function EmptyMessage() {
  return (
    <View style={{ flex: 1, padding: 30 }}>
      <Text style={styles.text}>
        For Actual to be useful, you need to add an account. You can link an
        account to automatically download transactions, or manage it locally
        yourself.
      </Text>
    </View>
  );
}

function AccountList({
  accounts,
  updatedAccounts,
  getBalanceQuery,
  getOnBudgetBalance,
  getOffBudgetBalance,
  onAddAccount,
  onSelectAccount,
  onSync,
}) {
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const budgetedAccounts = accounts.filter(account => account.offbudget === 0);
  const offbudgetAccounts = accounts.filter(account => account.offbudget === 1);

  return (
    <Page
      header={
        <MobilePageHeader
          title="Accounts"
          rightContent={
            <Button
              variant="bare"
              aria-label="Add account"
              className={String(
                css({
                  justifyContent: 'center',
                  color: theme.mobileHeaderText,
                  margin: 10,
                  ':hover': {
                    color: theme.mobileHeaderText,
                    background: theme.mobileHeaderTextHover,
                  },
                }),
              )}
              onPress={onAddAccount}
            >
              <SvgAdd width={20} height={20} />
            </Button>
          }
        />
      }
      padding={0}
      style={{
        paddingBottom: MOBILE_NAV_HEIGHT,
      }}
    >
      {accounts.length === 0 && <EmptyMessage />}
      <PullToRefresh onRefresh={onSync}>
        <View style={{ margin: 10 }}>
          {budgetedAccounts.length > 0 && (
            <AccountHeader name="For Budget" amount={getOnBudgetBalance()} />
          )}
          {budgetedAccounts.map(acct => (
            <AccountCard
              account={acct}
              key={acct.id}
              updated={updatedAccounts && updatedAccounts.includes(acct.id)}
              connected={!!acct.bank}
              pending={syncingAccountIds.includes(acct.id)}
              failed={failedAccounts && failedAccounts.has(acct.id)}
              getBalanceQuery={getBalanceQuery}
              onSelect={onSelectAccount}
            />
          ))}

          {offbudgetAccounts.length > 0 && (
            <AccountHeader
              name="Off Budget"
              amount={getOffBudgetBalance()}
              style={{ marginTop: 30 }}
            />
          )}
          {offbudgetAccounts.map(acct => (
            <AccountCard
              account={acct}
              key={acct.id}
              updated={updatedAccounts && updatedAccounts.includes(acct.id)}
              connected={!!acct.bank}
              pending={syncingAccountIds.includes(acct.id)}
              failed={failedAccounts && failedAccounts.has(acct.id)}
              getBalanceQuery={getBalanceQuery}
              onSelect={onSelectAccount}
            />
          ))}
        </View>
      </PullToRefresh>
    </Page>
  );
}

export function Accounts() {
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const updatedAccounts = useSelector(state => state.queries.updatedAccounts);
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const navigate = useNavigate();

  const onSelectAccount = id => {
    navigate(`/accounts/${id}`);
  };

  const onAddAccount = () => {
    dispatch(replaceModal('add-account'));
  };

  const onSync = () => {
    dispatch(syncAndDownload());
  };

  useSetThemeColor(theme.mobileViewTheme);

  return (
    <View style={{ flex: 1 }}>
      <AccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts.filter(account => !account.closed)}
        updatedAccounts={updatedAccounts}
        getBalanceQuery={queries.accountBalance}
        getOnBudgetBalance={queries.budgetedAccountBalance}
        getOffBudgetBalance={queries.offbudgetAccountBalance}
        onAddAccount={onAddAccount}
        onSelectAccount={onSelectAccount}
        onSync={onSync}
      />
    </View>
  );
}
