import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  useCallback,
} from 'react';
import { type DragItem } from 'react-aria';
import {
  DropIndicator,
  ListBox,
  ListBoxItem,
  useDragAndDrop,
} from 'react-aria-components';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgAdd, SvgCheveronRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { moveAccount } from 'loot-core/client/accounts/accountsSlice';
import { syncAndDownload } from 'loot-core/client/app/appSlice';
import { replaceModal } from 'loot-core/client/modals/modalsSlice';
import * as queries from 'loot-core/client/queries';
import { type AccountEntity } from 'loot-core/types/models';

import { useAccounts } from '../../../hooks/useAccounts';
import { useFailedAccounts } from '../../../hooks/useFailedAccounts';
import { useNavigate } from '../../../hooks/useNavigate';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useDispatch, useSelector } from '../../../redux';
import { makeAmountFullStyle } from '../../budget/util';
import { MobilePageHeader, Page } from '../../Page';
import { type Binding, type SheetFields } from '../../spreadsheet';
import { CellValue, CellValueText } from '../../spreadsheet/CellValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

type AccountHeaderProps<SheetFieldName extends SheetFields<'account'>> = {
  id: string;
  name: string;
  amount: Binding<'account', SheetFieldName>;
  style?: CSSProperties;
};

function AccountHeader<SheetFieldName extends SheetFields<'account'>>({
  id,
  name,
  amount,
  style = {},
}: AccountHeaderProps<SheetFieldName>) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Button
      variant="bare"
      aria-label={t('View {{name}} transactions', { name })}
      onPress={() => navigate(`/accounts/${id}`)}
      style={{
        flex: 1,
        flexDirection: 'row',
        paddingTop: 15,
        paddingBottom: 15,
        paddingLeft: 0,
        paddingRight: 0,
        color: theme.pageTextLight,
        width: '100%',
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
        <SvgCheveronRight
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
  getBalanceQuery: (account: AccountEntity) => Binding<'account', 'balance'>;
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
    <ListBoxItem textValue={account.name} {...props}>
      {itemProps => (
        <Button
          {...itemProps}
          style={{
            width: '100%',
            border: `1px solid ${theme.pillBorder}`,
            borderRadius: 6,
            boxShadow: `0 1px 1px ${theme.mobileAccountShadow}`,
            marginTop: 10,
          }}
          data-testid="account-list-item"
          onPress={() => onSelect(account)}
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
                ) : null
              }
              <TextOneLine
                style={{
                  ...styles.text,
                  fontSize: 17,
                  fontWeight: 600,
                  color: isUpdated ? theme.mobileAccountText : theme.pillText,
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
  getAccountBalance: (account: AccountEntity) => Binding<'account', 'balance'>;
  getOnBudgetBalance: () => Binding<'account', 'onbudget-accounts-balance'>;
  getOffBudgetBalance: () => Binding<'account', 'offbudget-accounts-balance'>;
  onAddAccount: () => void;
  onOpenAccount: (account: AccountEntity) => void;
  onSync: () => Promise<void>;
};

function AllAccountList({
  accounts,
  getAccountBalance,
  getOnBudgetBalance,
  getOffBudgetBalance,
  onAddAccount,
  onOpenAccount,
  onSync,
}: AllAccountListProps) {
  const { t } = useTranslation();
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
        <View aria-label={t('Account list')} style={{ margin: 10 }}>
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
              style={{ marginTop: 30 }}
            />
          )}
          <AccountList
            aria-label={t('Off budget accounts')}
            accounts={offBudgetAccounts}
            getAccountBalance={getAccountBalance}
            onOpenAccount={onOpenAccount}
          />
        </View>
      </PullToRefresh>
    </Page>
  );
}

type AccountListProps = {
  'aria-label': string;
  accounts: AccountEntity[];
  getAccountBalance: (account: AccountEntity) => Binding<'account', 'balance'>;
  onOpenAccount: (account: AccountEntity) => void;
};

function AccountList({
  'aria-label': ariaLabel,
  accounts,
  getAccountBalance: getBalanceBinding,
  onOpenAccount,
}: AccountListProps) {
  const failedAccounts = useFailedAccounts();
  const syncingAccountIds = useSelector(state => state.account.accountsSyncing);
  const updatedAccounts = useSelector(state => state.queries.updatedAccounts);
  const dispatch = useDispatch();

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
        dispatch(
          moveAccount({
            id: accountIdToMove,
            targetId: targetAccountId,
          }),
        );
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

        dispatch(
          moveAccount({
            id: accountIdToMove,
            // Due to the way `moveAccount` works, we use the account next to the
            // actual target account here because `moveAccount` always shoves the
            // account *before* the target account.
            // On the other hand, using `null` as `targetId`moves the account
            // to the end of the list.
            targetId: nextToTargetAccount?.id || null,
          }),
        );
      }
    },
  });
  return (
    <ListBox
      aria-label={ariaLabel}
      items={accounts}
      dragAndDropHooks={dragAndDropHooks}
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
}

export function Accounts() {
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

  const onSync = useCallback(async () => {
    dispatch(syncAndDownload({}));
  }, [dispatch]);

  return (
    <View style={{ flex: 1 }}>
      <AllAccountList
        // This key forces the whole table rerender when the number
        // format changes
        key={numberFormat + hideFraction}
        accounts={accounts.filter(account => !account.closed)}
        getAccountBalance={queries.accountBalance}
        getOnBudgetBalance={queries.onBudgetAccountBalance}
        getOffBudgetBalance={queries.offBudgetAccountBalance}
        onAddAccount={onAddAccount}
        onOpenAccount={onOpenAccount}
        onSync={onSync}
      />
    </View>
  );
}
