import React, { type CSSProperties, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { replaceModal, syncAndDownload } from 'loot-core/src/client/actions';
import * as queries from 'loot-core/src/client/queries';
import { type AccountEntity } from 'loot-core/types/models';

import { useAccounts } from '../../../hooks/useAccounts';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { SvgAdd } from '../../../icons/v1';
import { theme, styles } from '../../../style';
import { makeAmountFullStyle } from '../../budget/util';
import { Button } from '../../common/Button2';
import { Text } from '../../common/Text';
import { TextOneLine } from '../../common/TextOneLine';
import { View } from '../../common/View';
import { MobilePageHeader, Page } from '../../Page';
import { type Binding, type SheetFields } from '../../spreadsheet';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

type AccountHeaderProps<SheetFieldName extends SheetFields<'account'>> = {
  name: string;
  amount: Binding<'account', SheetFieldName>;
  style?: CSSProperties;
};

function AccountHeader<SheetFieldName extends SheetFields<'account'>>({
  name,
  amount,
  style = {},
}: AccountHeaderProps<SheetFieldName>) {
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
      <CellValue binding={amount} type="financial">
        {props => (
          <CellValueText<'account', SheetFieldName>
            {...props}
            style={{ ...styles.text, fontSize: 14 }}
          />
        )}
      </CellValue>
    </View>
  );
}

type AccountCardProps = {
  account: AccountEntity;
  updated: boolean;
  connected: boolean;
  pending: boolean;
  failed: boolean;
  getBalanceQuery: (account: AccountEntity) => Binding<'account', 'balance'>;
  onSelect: (id: string) => void;
};

function AccountCard({
  account,
  updated,
  connected,
  pending,
  failed,
  getBalanceQuery,
  onSelect,
}: AccountCardProps) {
  return (
    <Button
      onPress={() => onSelect(account.id)}
      style={{
        border: `1px solid ${theme.pillBorder}`,
        borderRadius: 6,
        boxShadow: `0 1px 1px ${theme.mobileAccountShadow}`,
        marginTop: 10,
      }}
      data-testid="account"
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
          {
            /* TODO: Should bankId be part of the AccountEntity type? */
            'bankId' in account && account.bankId ? (
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
            ) : null
          }
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
      <CellValue binding={getBalanceQuery(account)} type="financial">
        {props => (
          <CellValueText<'account', 'balance'>
            {...props}
            style={{
              fontSize: 16,
              ...makeAmountFullStyle(props.value),
            }}
            data-testid="account-balance"
          />
        )}
      </CellValue>
    </Button>
  );
}

function EmptyMessage() {
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, padding: 30 }}>
      <Text style={styles.text}>
        {t(
          'For Actual to be useful, you need to add an account. You can link an account to automatically download transactions, or manage it locally yourself.',
        )}
      </Text>
    </View>
  );
}

type AccountListProps = {
  accounts: AccountEntity[];
  updatedAccounts: Array<AccountEntity['id']>;
  getBalanceQuery: (account: AccountEntity) => Binding<'account', 'balance'>;
  getOnBudgetBalance: () => Binding<'account', 'onbudget-accounts-balance'>;
  getOffBudgetBalance: () => Binding<'account', 'offbudget-accounts-balance'>;
  onAddAccount: () => void;
  onSelectAccount: (id: string) => void;
  onSync: () => Promise<void>;
};

function AccountList({
  accounts,
  updatedAccounts,
  getBalanceQuery,
  getOnBudgetBalance,
  getOffBudgetBalance,
  onAddAccount,
  onSelectAccount,
  onSync,
}: AccountListProps) {
  const { t } = useTranslation();
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const onBudgetAccounts = accounts.filter(account => account.offbudget === 0);
  const offBudgetAccounts = accounts.filter(account => account.offbudget === 1);

  return (
    <Page
      header={
        <MobilePageHeader
          title={t('Accounts')}
          rightContent={
            <Button
              variant="bare"
              aria-label={t('Add account')}
              style={{ margin: 10 }}
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
        <View aria-label="Account list" style={{ margin: 10 }}>
          {onBudgetAccounts.length > 0 && (
            <AccountHeader name="On budget" amount={getOnBudgetBalance()} />
          )}
          {onBudgetAccounts.map(acct => (
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

          {offBudgetAccounts.length > 0 && (
            <AccountHeader
              name="Off budget"
              amount={getOffBudgetBalance()}
              style={{ marginTop: 30 }}
            />
          )}
          {offBudgetAccounts.map(acct => (
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

  const onSelectAccount = useCallback(
    (id: AccountEntity['id']) => {
      navigate(`/accounts/${id}`);
    },
    [navigate],
  );

  const onAddAccount = useCallback(() => {
    dispatch(replaceModal('add-account'));
  }, [dispatch]);

  const onSync = useCallback(async () => {
    dispatch(syncAndDownload());
  }, [dispatch]);

  return (
    <View style={{ flex: 1 }}>
      <AccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts.filter(account => !account.closed)}
        updatedAccounts={updatedAccounts}
        getBalanceQuery={queries.accountBalance}
        getOnBudgetBalance={queries.onBudgetAccountBalance}
        getOffBudgetBalance={queries.offBudgetAccountBalance}
        onAddAccount={onAddAccount}
        onSelectAccount={onSelectAccount}
        onSync={onSync}
      />
    </View>
  );
}
