import React, { forwardRef, useCallback, useRef } from 'react';
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import type { DragItem } from 'react-aria';
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgCheveronDown,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import type { AccountEntity } from 'loot-core/types/models';

import {
  useMoveAccountMutation,
  useSyncAndDownloadMutation,
} from '@desktop-client/accounts';
import { makeAmountFullStyle } from '@desktop-client/components/budget/util';
import { MOBILE_NAV_HEIGHT } from '@desktop-client/components/mobile/MobileNavTabs';
import { PullToRefresh } from '@desktop-client/components/mobile/PullToRefresh';
import { MobilePageHeader, Page } from '@desktop-client/components/Page';
import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { replaceModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch, useSelector } from '@desktop-client/redux';
import type { Binding, SheetFields } from '@desktop-client/spreadsheet';
import * as bindings from '@desktop-client/spreadsheet/bindings';

const ROW_HEIGHT = 60;

type AccountHeaderProps<SheetFieldName extends SheetFields<'account'>> = {
  id: string;
  name: string;
  amount: Binding<'account', SheetFieldName>;
  style?: CSSProperties;
  showCheveronDown?: boolean;
  onPress?: () => void;
};

function AccountHeader<SheetFieldName extends SheetFields<'account'>>({
  id,
  name,
  amount,
  style = {},
  showCheveronDown = false,
  onPress,
}: AccountHeaderProps<SheetFieldName>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const Cheveron = showCheveronDown ? SvgCheveronDown : SvgCheveronRight;

  return (
    <Button
      variant="bare"
      aria-label={t('View {{name}} transactions', { name })}
      onPress={onPress ? onPress : () => navigate(`/accounts/${id}`)}
      style={{
        height: ROW_HEIGHT,
        width: '100%',
        padding: '0 18px',
        color: theme.pageTextLight,
        ...style,
      }}
      // to match the feel of the other account buttons
      className={css([
        {
          '&[data-pressed], &[data-hovered]': {
            backgroundColor: 'transparent',
            transform: 'translateY(1px)',
          },
        },
      ])}
    >
      <View style={{ flex: 1, alignItems: 'center', flexDirection: 'row' }}>
        <Text
          style={{
            ...styles.text,
            fontSize: 17,
          }}
          data-testid="name"
        >
          {name}
        </Text>
        <Cheveron
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={styles.text.fontSize}
          height={styles.text.fontSize}
        />
      </View>
      <CellValue binding={amount} type="financial">
        {props => (
          <CellValueText<'account', SheetFieldName>
            {...props}
            style={{ ...styles.text }}
          />
        )}
      </CellValue>
    </Button>
  );
}

type AccountListItemProps = ComponentPropsWithoutRef<
  typeof ListBoxItem<AccountEntity>
> & {
  isUpdated: boolean;
  isConnected: boolean;
  isPending: boolean;
  isFailed: boolean;
  getBalanceQuery: (
    accountId: AccountEntity['id'],
  ) => Binding<'account', 'balance'>;
  onSelect: (account: AccountEntity) => void;
};

function AccountListItem({
  isUpdated,
  isConnected,
  isPending,
  isFailed,
  getBalanceQuery,
  onSelect,
  ...props
}: AccountListItemProps) {
  const { value: account } = props;

  if (!account) {
    return null;
  }

  return (
    <ListBoxItem
      textValue={account.name}
      className={css({
        borderBottom: `1px solid ${theme.tableBorder}`,
        '&:last-child': {
          borderBottom: 'none',
        },
      })}
      {...props}
    >
      {itemProps => (
        <Button
          {...itemProps}
          style={{
            height: ROW_HEIGHT,
            width: '100%',
            backgroundColor: theme.tableBackground,
            border: 'none',
            borderRadius: 0,
            paddingLeft: 20,
          }}
          data-testid="account-list-item"
          onPress={() => onSelect(account)}
        >
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              flexDirection: 'row',
            }}
          >
            {account.bankId ? (
              <View
                style={{
                  backgroundColor: isPending
                    ? theme.sidebarItemBackgroundPending
                    : isFailed
                      ? theme.sidebarItemBackgroundFailed
                      : theme.sidebarItemBackgroundPositive,
                  marginRight: '8px',
                  width: 8,
                  flexShrink: 0,
                  height: 8,
                  borderRadius: 8,
                  opacity: isConnected ? 1 : 0,
                }}
              />
            ) : null}
            <TextOneLine
              style={{
                ...styles.text,
                fontSize: 17,
                fontWeight: 600,
                color: isUpdated ? theme.mobileAccountText : theme.pillText,
              }}
              data-testid="account-name"
            >
              {account.name}
            </TextOneLine>
          </View>
          <CellValue binding={getBalanceQuery(account.id)} type="financial">
            {props => (
              <CellValueText<'account', 'balance'>
                {...props}
                style={{
                  fontSize: 16,
                  ...makeAmountFullStyle(props.value, {
                    positiveColor: theme.numberPositive,
                    negativeColor: theme.numberNegative,
                    zeroColor: theme.numberNeutral,
                  }),
                }}
                data-testid="account-balance"
              />
            )}
          </CellValue>
        </Button>
      )}
    </ListBoxItem>
  );
}

function EmptyMessage() {
  return (
    <View style={{ flex: 1, padding: 30 }}>
      <Text style={styles.text}>
        <Trans>
          For Actual to be useful, you need to <strong>add an account</strong>.
          You can link an account to automatically download transactions, or
          manage it locally yourself.
        </Trans>
      </Text>
    </View>
  );
}

type AllAccountListProps = {
  accounts: AccountEntity[];
  getAccountBalance: (
    accountId: AccountEntity['id'],
  ) => Binding<'account', 'balance'>;
  getAllAccountsBalance: () => Binding<'account', 'accounts-balance'>;
  getOnBudgetBalance: () => Binding<'account', 'onbudget-accounts-balance'>;
  getOffBudgetBalance: () => Binding<'account', 'offbudget-accounts-balance'>;
  getClosedAccountsBalance: () => Binding<'account', 'closed-accounts-balance'>;
  onAddAccount: () => void;
  onOpenAccount: (account: AccountEntity) => void;
  onSync: () => Promise<void>;
};

function AllAccountList({
  accounts,
  getAccountBalance,
  getAllAccountsBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  getClosedAccountsBalance,
  onAddAccount,
  onOpenAccount,
  onSync,
}: AllAccountListProps) {
  const { t } = useTranslation();
  const onBudgetAccounts = accounts.filter(
    account => account.offbudget === 0 && account.closed === 0,
  );
  const offBudgetAccounts = accounts.filter(
    account => account.offbudget === 1 && account.closed === 0,
  );
  const closedAccounts = accounts.filter(account => account.closed === 1);

  const closedAccountsRef = useRef<HTMLDivElement | null>(null);
  const [showClosedAccounts, setShowClosedAccountsPref] = useLocalPref(
    'ui.showClosedAccounts',
  );

  const onToggleClosedAccounts = () => {
    const toggledState = !showClosedAccounts;
    setShowClosedAccountsPref(toggledState);
    if (toggledState) {
      // Make sure to scroll to the closed accounts when the user presses
      // on the account header, otherwise it's not clear that the accounts are there.
      // Delay the scroll until the component is rendered, otherwise the scroll
      // won't work.
      setTimeout(() => {
        closedAccountsRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

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
    >
      {accounts.length === 0 && <EmptyMessage />}
      <PullToRefresh onRefresh={onSync}>
        <View
          aria-label={t('Account list')}
          style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
        >
          <AccountHeader
            id="all"
            name={t('All accounts')}
            amount={getAllAccountsBalance()}
          />
          {onBudgetAccounts.length > 0 && (
            <AccountHeader
              id="onbudget"
              name={t('On budget')}
              amount={getOnBudgetBalance()}
            />
          )}
          <AccountList
            aria-label={t('On budget accounts')}
            accounts={onBudgetAccounts}
            getAccountBalance={getAccountBalance}
            onOpenAccount={onOpenAccount}
          />
          {offBudgetAccounts.length > 0 && (
            <AccountHeader
              id="offbudget"
              name={t('Off budget')}
              amount={getOffBudgetBalance()}
            />
          )}
          <AccountList
            aria-label={t('Off budget accounts')}
            accounts={offBudgetAccounts}
            getAccountBalance={getAccountBalance}
            onOpenAccount={onOpenAccount}
          />
          {closedAccounts.length > 0 && (
            <AccountHeader
              id="closed"
              name={t('Closed')}
              onPress={onToggleClosedAccounts}
              amount={getClosedAccountsBalance()}
              style={{ marginTop: 30 }}
              showCheveronDown={showClosedAccounts}
            />
          )}
          {showClosedAccounts && (
            <AccountList
              aria-label={t('Closed accounts')}
              accounts={closedAccounts}
              getAccountBalance={getAccountBalance}
              onOpenAccount={onOpenAccount}
              ref={el => {
                if (el) closedAccountsRef.current = el;
              }}
            />
          )}
        </View>
      </PullToRefresh>
    </Page>
  );
}

type AccountListProps = {
  'aria-label': string;
  accounts: AccountEntity[];
  getAccountBalance: (
    accountId: AccountEntity['id'],
  ) => Binding<'account', 'balance'>;
  onOpenAccount: (account: AccountEntity) => void;
};

const AccountList = forwardRef<HTMLDivElement, AccountListProps>(
  (
    {
      'aria-label': ariaLabel,
      accounts,
      getAccountBalance: getBalanceBinding,
      onOpenAccount,
    }: AccountListProps,
    ref,
  ) => {
    const failedAccounts = useFailedAccounts();
    const syncingAccountIds = useSelector(
      state => state.account.accountsSyncing,
    );
    const updatedAccounts = useSelector(state => state.account.updatedAccounts);

    const moveAccount = useMoveAccountMutation();

    const { dragAndDropHooks } = useDragAndDrop({
      getItems: keys =>
        [...keys].map(
          key =>
            ({
              'text/plain': key as AccountEntity['id'],
            }) as DragItem,
        ),
      renderDropIndicator: target => {
        return (
          <DropIndicator
            target={target}
            className={css({
              '&[data-drop-target]': {
                height: 4,
                backgroundColor: theme.tableBorderSeparator,
                opacity: 1,
                borderRadius: 4,
              },
            })}
          />
        );
      },
      onReorder: e => {
        const [key] = e.keys;
        const accountIdToMove = key as AccountEntity['id'];
        const targetAccountId = e.target.key as AccountEntity['id'];

        if (e.target.dropPosition === 'before') {
          moveAccount.mutate({
            id: accountIdToMove,
            targetId: targetAccountId,
          });
        } else if (e.target.dropPosition === 'after') {
          const targetAccountIndex = accounts.findIndex(
            account => account.id === e.target.key,
          );
          if (targetAccountIndex === -1) {
            throw new Error(
              `Internal error: account with ID ${targetAccountId} not found.`,
            );
          }

          const nextToTargetAccount = accounts[targetAccountIndex + 1];

          moveAccount.mutate({
            id: accountIdToMove,
            // Due to the way `moveAccount` works, we use the account next to the
            // actual target account here because `moveAccount` always shoves the
            // account *before* the target account.
            // On the other hand, using `null` as `targetId`moves the account
            // to the end of the list.
            targetId: nextToTargetAccount?.id || null,
          });
        }
      },
    });
    return (
      <ListBox
        aria-label={ariaLabel}
        items={accounts}
        dragAndDropHooks={dragAndDropHooks}
        ref={ref}
        style={{
          display: 'flex',
          flexDirection: 'column',
          margin: '0 8px',
          border: `1px solid ${theme.tableBorder}`,
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {account => (
          <AccountListItem
            key={account.id}
            id={account.id}
            value={account}
            isUpdated={updatedAccounts && updatedAccounts.includes(account.id)}
            isConnected={!!account.bank}
            isPending={syncingAccountIds.includes(account.id)}
            isFailed={failedAccounts && failedAccounts.has(account.id)}
            getBalanceQuery={getBalanceBinding}
            onSelect={onOpenAccount}
          />
        )}
      </ListBox>
    );
  },
);

AccountList.displayName = 'AccountList';

export function AccountsPage() {
  const dispatch = useDispatch();
  const accounts = useAccounts();
  const [_numberFormat] = useSyncedPref('numberFormat');
  const numberFormat = _numberFormat || 'comma-dot';
  const [hideFraction] = useSyncedPref('hideFraction');

  const navigate = useNavigate();

  const onOpenAccount = useCallback(
    (account: AccountEntity) => {
      navigate(`/accounts/${account.id}`);
    },
    [navigate],
  );

  const onAddAccount = useCallback(() => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  }, [dispatch]);

  const syncAndDownload = useSyncAndDownloadMutation();
  const onSync = useCallback(async () => {
    syncAndDownload.mutate({});
  }, [syncAndDownload]);

  return (
    <View style={{ flex: 1 }}>
      <AllAccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts}
        getAccountBalance={bindings.accountBalance}
        getAllAccountsBalance={bindings.allAccountBalance}
        getOnBudgetBalance={bindings.onBudgetAccountBalance}
        getOffBudgetBalance={bindings.offBudgetAccountBalance}
        getClosedAccountsBalance={bindings.closedAccountBalance}
        onAddAccount={onAddAccount}
        onOpenAccount={onOpenAccount}
        onSync={onSync}
      />
    </View>
  );
}
