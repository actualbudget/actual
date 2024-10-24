import React, {
  useState,
  useRef,
  Fragment,
  type ReactNode,
  type ComponentProps,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { type Query } from 'loot-core/shared/query';
import {
  type AccountEntity,
  type RuleConditionEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/types/models';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useSplitsExpanded } from '../../hooks/useSplitsExpanded';
import { useSyncServerStatus } from '../../hooks/useSyncServerStatus';
// import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { SvgAdd } from '../../icons/v1';
import {
  SvgArrowsExpand3,
  SvgArrowsShrink3,
  SvgDownloadThickBottom,
  SvgLockClosed,
  SvgPencil1,
} from '../../icons/v2';
import { theme, styles } from '../../style';
import { AnimatedRefresh } from '../AnimatedRefresh';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { MenuButton } from '../common/MenuButton';
import { Popover } from '../common/Popover';
import { Search } from '../common/Search';
import { Stack } from '../common/Stack';
import { View } from '../common/View';
import { FilterButton } from '../filters/FiltersMenu';
import { FiltersStack } from '../filters/FiltersStack';
import { type SavedFilter } from '../filters/SavedFilterMenuButton';
import { NotesButton } from '../NotesButton';
import { SelectedTransactionsButton } from '../transactions/SelectedTransactionsButton';

import { type TableRef } from './Account';
import { Balances } from './Balance';
import { ReconcilingMessage, ReconcileMenu } from './Reconcile';

type AccountHeaderProps = {
  tableRef: TableRef;
  editingName: boolean;
  isNameEditable: boolean;
  isLoading: boolean;
  accountId: AccountEntity['id'] | string;
  accountName: string;
  account: AccountEntity;
  filterId?: SavedFilter;
  savedFilters: TransactionFilterEntity[];
  accountsSyncing: string[];
  failedAccounts: AccountSyncSidebarProps['failedAccounts'];
  accounts: AccountEntity[];
  transactions: readonly TransactionEntity[];
  showBalances: boolean;
  showExtraBalances: boolean;
  showCleared: boolean;
  showReconciled: boolean;
  showEmptyMessage: boolean;
  balanceQuery: Query;
  filteredQuery: Query;
  reconcileAmount: number;
  canCalculateBalance: () => boolean;
  showFilteredBalance: boolean;
  filteredBalance: number;
  isSorted: boolean;
  search: string;
  filterConditions: RuleConditionEntity[];
  filterConditionsOp: 'and' | 'or';
  onSearch: (newSearch: string) => void;
  onAddTransaction: () => void;
  onShowTransactions: ComponentProps<
    typeof SelectedTransactionsButton
  >['onShow'];
  onDoneReconciling: ComponentProps<typeof ReconcilingMessage>['onDone'];
  onCreateReconciliationTransaction: ComponentProps<
    typeof ReconcilingMessage
  >['onCreateTransaction'];
  onToggleExtraBalances: ComponentProps<
    typeof Balances
  >['onToggleExtraBalances'];
  onSaveName: AccountNameFieldProps['onSaveName'];
  saveNameError: AccountNameFieldProps['saveNameError'];
  onExposeName: (isExposed: boolean) => void;
  onSync: () => void;
  onImport: () => void;
  onMenuSelect: AccountMenuProps['onMenuSelect'];
  onReconcile: ComponentProps<typeof ReconcileMenu>['onReconcile'];
  onBatchEdit: ComponentProps<typeof SelectedTransactionsButton>['onEdit'];
  onBatchDelete: ComponentProps<typeof SelectedTransactionsButton>['onDelete'];
  onBatchDuplicate: ComponentProps<
    typeof SelectedTransactionsButton
  >['onDuplicate'];
  onBatchLinkSchedule: ComponentProps<
    typeof SelectedTransactionsButton
  >['onLinkSchedule'];
  onBatchUnlinkSchedule: ComponentProps<
    typeof SelectedTransactionsButton
  >['onUnlinkSchedule'];
  onApplyFilter: (filter: RuleConditionEntity) => void;
} & Pick<
  ComponentProps<typeof SelectedTransactionsButton>,
  | 'onCreateRule'
  | 'onScheduleAction'
  | 'onSetTransfer'
  | 'onMakeAsSplitTransaction'
  | 'onMakeAsNonSplitTransactions'
> &
  Pick<
    ComponentProps<typeof FiltersStack>,
    | 'onUpdateFilter'
    | 'onDeleteFilter'
    | 'onConditionsOpChange'
    | 'onClearFilters'
    | 'onReloadSavedFilter'
  >;

export function AccountHeader({
  tableRef,
  editingName,
  isNameEditable,
  isLoading,
  accountId,
  accountName,
  account,
  filterId,
  savedFilters,
  accountsSyncing,
  failedAccounts,
  accounts,
  transactions,
  showBalances,
  showExtraBalances,
  showCleared,
  showReconciled,
  showEmptyMessage,
  // transactionsQuery,
  balanceQuery,
  reconcileAmount,
  // canCalculateBalance,
  showFilteredBalance,
  filteredBalance,
  isSorted,
  // search,
  filterConditions,
  filterConditionsOp,
  onSearch,
  onAddTransaction,
  onShowTransactions,
  onDoneReconciling,
  onCreateReconciliationTransaction,
  onToggleExtraBalances,
  onSaveName,
  saveNameError,
  onExposeName,
  onSync,
  onImport,
  onMenuSelect,
  onReconcile,
  onBatchDelete,
  onBatchDuplicate,
  onBatchEdit,
  onBatchLinkSchedule,
  onBatchUnlinkSchedule,
  onCreateRule,
  onApplyFilter,
  onUpdateFilter,
  onClearFilters,
  onReloadSavedFilter,
  onConditionsOpChange,
  onDeleteFilter,
  onScheduleAction,
  onSetTransfer,
  onMakeAsSplitTransaction,
  onMakeAsNonSplitTransactions,
}: AccountHeaderProps) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const triggerRef = useRef(null);
  const reconcileRef = useRef(null);
  const splitsExpanded = useSplitsExpanded();
  const syncServerStatus = useSyncServerStatus();
  const isUsingServer = syncServerStatus !== 'no-server';
  const isServerOffline = syncServerStatus === 'offline';
  const [_, setExpandSplitsPref] = useLocalPref('expand-splits');
  const [search, setSearch] = useState('');

  let canSync = !!(account?.account_id && isUsingServer);
  if (!account) {
    // All accounts - check for any syncable account
    canSync = !!accounts.find(account => !!account.account_id) && isUsingServer;
  }

  // Only show the ability to make linked transfers on multi-account views.
  const showMakeTransfer = !account;

  function onToggleSplits() {
    if (tableRef.current) {
      splitsExpanded.dispatch({
        type: 'switch-mode',
        id: tableRef.current.getScrolledItem(),
      });

      setExpandSplitsPref(!(splitsExpanded.state.mode === 'expand'));
    }
  }

  useHotkeys(
    'ctrl+f, cmd+f, meta+f',
    () => {
      if (searchInput.current) {
        searchInput.current.focus();
      }
    },
    {
      enableOnFormTags: true,
      preventDefault: true,
      scopes: ['app'],
    },
    [searchInput],
  );
  useHotkeys(
    't',
    () => onAddTransaction(),
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [onAddTransaction],
  );
  useHotkeys(
    'ctrl+i, cmd+i, meta+i',
    () => onImport(),
    {
      scopes: ['app'],
    },
    [onImport],
  );
  useHotkeys(
    'ctrl+b, cmd+b, meta+b',
    () => onSync(),
    {
      enabled: canSync && !isServerOffline,
      preventDefault: true,
      scopes: ['app'],
    },
    [onSync],
  );

  return (
    <>
      <View style={{ ...styles.pageContent, paddingBottom: 10, flexShrink: 0 }}>
        <View
          style={{ marginTop: 2, marginBottom: 10, alignItems: 'flex-start' }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
            }}
          >
            {!!account?.bank && (
              <AccountSyncSidebar
                account={account}
                failedAccounts={failedAccounts}
                accountsSyncing={accountsSyncing}
              />
            )}
            <AccountNameField
              account={account}
              accountName={accountName}
              isNameEditable={isNameEditable}
              editingName={editingName}
              saveNameError={saveNameError}
              onSaveName={onSaveName}
              onExposeName={onExposeName}
            />
          </View>
        </View>

        <Balances
          // isLoading={isLoading}
          accountId={accountId}
          balanceQuery={balanceQuery}
          filteredBalance={filteredBalance}
          showFilteredBalance={showFilteredBalance}
          showExtraBalances={showExtraBalances}
          onToggleExtraBalances={onToggleExtraBalances}
        />

        <Stack
          spacing={2}
          direction="row"
          align="center"
          style={{ marginTop: 12 }}
        >
          {canSync && (
            <Button
              variant="bare"
              onPress={onSync}
              isDisabled={isServerOffline}
            >
              <AnimatedRefresh
                width={13}
                height={13}
                animating={
                  account
                    ? accountsSyncing.includes(account.id)
                    : accountsSyncing.length > 0
                }
              />{' '}
              {isServerOffline ? t('Bank Sync Offline') : t('Bank Sync')}
            </Button>
          )}

          {account && !account.closed && (
            <Button variant="bare" onPress={onImport}>
              <SvgDownloadThickBottom
                width={13}
                height={13}
                style={{ marginRight: 4 }}
              />{' '}
              <Trans>Import</Trans>
            </Button>
          )}

          {!showEmptyMessage && (
            <Button variant="bare" onPress={onAddTransaction}>
              <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
              <Trans>Add New</Trans>
            </Button>
          )}
          <View style={{ flexShrink: 0 }}>
            {/* @ts-expect-error fix me */}
            <FilterButton onApply={onApplyFilter} />
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Search')}
            value={search}
            onChange={search => {
              setSearch(search);
              onSearch?.(search);
            }}
            inputRef={searchInput}
          />
          <SelectedTransactionsButton
            isLoading={isLoading}
            getTransaction={id => transactions.find(t => t.id === id)}
            onShow={onShowTransactions}
            onDuplicate={onBatchDuplicate}
            onDelete={onBatchDelete}
            onEdit={onBatchEdit}
            onLinkSchedule={onBatchLinkSchedule}
            onUnlinkSchedule={onBatchUnlinkSchedule}
            onCreateRule={onCreateRule}
            onSetTransfer={onSetTransfer}
            onScheduleAction={onScheduleAction}
            showMakeTransfer={showMakeTransfer}
            onMakeAsSplitTransaction={onMakeAsSplitTransaction}
            onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
          />

          {account && (
            <View>
              <Button
                ref={reconcileRef}
                variant="bare"
                aria-label={t('Reconcile')}
                style={{ padding: 6, marginLeft: 10 }}
                onPress={() => {
                  setReconcileOpen(true);
                }}
              >
                <View title={t('Reconcile')}>
                  <SvgLockClosed width={14} height={14} />
                </View>
              </Button>
              <Popover
                placement="bottom"
                triggerRef={reconcileRef}
                style={{ width: 275 }}
                isOpen={reconcileOpen}
                onOpenChange={() => setReconcileOpen(false)}
              >
                <ReconcileMenu
                  account={account}
                  onClose={() => setReconcileOpen(false)}
                  onReconcile={onReconcile}
                />
              </Popover>
            </View>
          )}
          <Button
            variant="bare"
            aria-label={
              splitsExpanded.state.mode === 'collapse'
                ? t('Collapse split transactions')
                : t('Expand split transactions')
            }
            isDisabled={search !== '' || filterConditions.length > 0}
            style={{ padding: 6 }}
            onPress={onToggleSplits}
          >
            <View
              title={
                splitsExpanded.state.mode === 'collapse'
                  ? t('Collapse split transactions')
                  : t('Expand split transactions')
              }
            >
              {splitsExpanded.state.mode === 'collapse' ? (
                <SvgArrowsShrink3 style={{ width: 14, height: 14 }} />
              ) : (
                <SvgArrowsExpand3 style={{ width: 14, height: 14 }} />
              )}
            </View>
          </Button>
          {account ? (
            <View>
              <MenuButton
                aria-label="Account menu"
                ref={triggerRef}
                onPress={() => setMenuOpen(true)}
              />

              <Popover
                triggerRef={triggerRef}
                style={{ width: 275 }}
                isOpen={menuOpen}
                onOpenChange={() => setMenuOpen(false)}
              >
                <AccountMenu
                  account={account}
                  canSync={canSync}
                  // canShowBalances={canCalculateBalance()}
                  isSorted={isSorted}
                  showBalances={showBalances}
                  showCleared={showCleared}
                  showReconciled={showReconciled}
                  onMenuSelect={item => {
                    setMenuOpen(false);
                    onMenuSelect(item);
                  }}
                />
              </Popover>
            </View>
          ) : (
            <View>
              <MenuButton
                aria-label="Account menu"
                ref={triggerRef}
                onPress={() => setMenuOpen(true)}
              />

              <Popover
                triggerRef={triggerRef}
                isOpen={menuOpen}
                onOpenChange={() => setMenuOpen(false)}
              >
                <Menu
                  onMenuSelect={item => {
                    setMenuOpen(false);
                    onMenuSelect(item);
                  }}
                  items={[
                    ...(isSorted
                      ? [
                          {
                            name: 'remove-sorting',
                            text: t('Remove all sorting'),
                          } as const,
                        ]
                      : []),
                    { name: 'export', text: t('Export') },
                  ]}
                />
              </Popover>
            </View>
          )}
        </Stack>

        {filterConditions?.length > 0 && (
          <FiltersStack
            conditions={filterConditions}
            conditionsOp={filterConditionsOp}
            onUpdateFilter={onUpdateFilter}
            onDeleteFilter={onDeleteFilter}
            onClearFilters={onClearFilters}
            onReloadSavedFilter={onReloadSavedFilter}
            filterId={filterId}
            savedFilters={savedFilters}
            onConditionsOpChange={onConditionsOpChange}
          />
        )}
      </View>
      {reconcileAmount != null && (
        <ReconcilingMessage
          accountId={accountId}
          targetBalance={reconcileAmount}
          balanceQuery={balanceQuery}
          onDone={onDoneReconciling}
          onCreateTransaction={onCreateReconciliationTransaction}
        />
      )}
    </>
  );
}

type AccountSyncSidebarProps = {
  account: AccountEntity;
  failedAccounts: Map<
    string,
    {
      type: string;
      code: string;
    }
  >;
  accountsSyncing: string[];
};

function AccountSyncSidebar({
  account,
  failedAccounts,
  accountsSyncing,
}: AccountSyncSidebarProps) {
  return (
    <View
      style={{
        backgroundColor: accountsSyncing.includes(account.id)
          ? theme.sidebarItemBackgroundPending
          : failedAccounts.has(account.id)
            ? theme.sidebarItemBackgroundFailed
            : theme.sidebarItemBackgroundPositive,
        marginRight: '4px',
        width: 8,
        height: 8,
        borderRadius: 8,
      }}
    />
  );
}

type AccountNameFieldProps = {
  account: AccountEntity;
  accountName: string;
  isNameEditable: boolean;
  editingName: boolean;
  saveNameError?: ReactNode;
  onSaveName: (newName: string) => void;
  onExposeName: (isExposed: boolean) => void;
};

function AccountNameField({
  account,
  accountName,
  isNameEditable,
  editingName,
  saveNameError,
  onSaveName,
  onExposeName,
}: AccountNameFieldProps) {
  const { t } = useTranslation();

  if (editingName) {
    return (
      <Fragment>
        <InitialFocus>
          <Input
            defaultValue={accountName}
            onEnter={e => onSaveName(e.currentTarget.value)}
            onBlur={e => onSaveName(e.target.value)}
            onEscape={() => onExposeName(false)}
            style={{
              fontSize: 25,
              fontWeight: 500,
              marginTop: -3,
              marginBottom: -4,
              marginLeft: -6,
              paddingTop: 2,
              paddingBottom: 2,
              width: Math.max(20, accountName.length) + 'ch',
            }}
          />
        </InitialFocus>
        {saveNameError && (
          <View style={{ color: theme.warningText }}>{saveNameError}</View>
        )}
      </Fragment>
    );
  } else {
    if (isNameEditable) {
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 3,
            '& .hover-visible': {
              opacity: 0,
              transition: 'opacity .25s',
            },
            '&:hover .hover-visible': {
              opacity: 1,
            },
          }}
        >
          <View
            style={{
              fontSize: 25,
              fontWeight: 500,
              marginRight: 5,
              marginBottom: -1,
            }}
            data-testid="account-name"
          >
            {account && account.closed
              ? t('Closed: {{ accountName }}', { accountName })
              : accountName}
          </View>

          {account && (
            <NotesButton
              id={`account-${account.id}`}
              defaultColor={theme.pageTextSubdued}
            />
          )}
          <Button
            variant="bare"
            aria-label={t('Edit account name')}
            className="hover-visible"
            onPress={() => onExposeName(true)}
          >
            <SvgPencil1
              style={{
                width: 11,
                height: 11,
                color: theme.pageTextSubdued,
              }}
            />
          </Button>
        </View>
      );
    } else {
      return (
        <View
          style={{ fontSize: 25, fontWeight: 500, marginBottom: -1 }}
          data-testid="account-name"
        >
          {account && account.closed
            ? t('Closed: {{ accountName }}', { accountName })
            : accountName}
        </View>
      );
    }
  }
}

type AccountMenuProps = {
  account: AccountEntity;
  canSync: boolean;
  showBalances: boolean;
  // canShowBalances: boolean;
  showCleared: boolean;
  showReconciled: boolean;
  isSorted: boolean;
  onMenuSelect: (
    item:
      | 'link'
      | 'unlink'
      | 'close'
      | 'reopen'
      | 'export'
      | 'toggle-balance'
      | 'remove-sorting'
      | 'toggle-cleared'
      | 'toggle-reconciled',
  ) => void;
};

function AccountMenu({
  account,
  canSync,
  showBalances,
  // canShowBalances,
  showCleared,
  showReconciled,
  isSorted,
  onMenuSelect,
}: AccountMenuProps) {
  const { t } = useTranslation();
  const syncServerStatus = useSyncServerStatus();

  return (
    <Menu
      onMenuSelect={item => {
        onMenuSelect(item);
      }}
      items={[
        ...(isSorted
          ? [
              {
                name: 'remove-sorting',
                text: t('Remove all sorting'),
              } as const,
            ]
          : []),
        // ...(canShowBalances
        //   ? [
        //       {
        //         name: 'toggle-balance',
        //         text: showBalances
        //           ? t('Hide running balance')
        //           : t('Show running balance'),
        //       } as const,
        //     ]
        //   : []),[
        {
          name: 'toggle-balance',
          text: showBalances
            ? t('Hide running balance')
            : t('Show running balance'),
        },
        {
          name: 'toggle-cleared',
          text: showCleared
            ? t('Hide “cleared” checkboxes')
            : t('Show “cleared” checkboxes'),
        },
        {
          name: 'toggle-reconciled',
          text: showReconciled
            ? t('Hide reconciled transactions')
            : t('Show reconciled transactions'),
        },
        { name: 'export', text: t('Export') },
        ...(account && !account.closed
          ? canSync
            ? [
                {
                  name: 'unlink',
                  text: t('Unlink account'),
                } as const,
              ]
            : syncServerStatus === 'online'
              ? [
                  {
                    name: 'link',
                    text: t('Link account'),
                  } as const,
                ]
              : []
          : []),

        ...(account.closed
          ? [{ name: 'reopen', text: t('Reopen account') } as const]
          : [{ name: 'close', text: t('Close account') } as const]),
      ]}
    />
  );
}
