import React, {
  type ComponentProps,
  type ReactNode,
  useRef,
  useState,
} from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { AnimatedLoading } from '@actual-app/components/icons/AnimatedLoading';
import {
  SvgAdd,
  SvgDotsHorizontalTriple,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsExpand3,
  SvgArrowsShrink3,
  SvgDownloadThickBottom,
  SvgLockClosed,
  SvgPencil1,
} from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Stack } from '@actual-app/components/stack';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

import { tsToRelativeTime } from 'loot-core/shared/util';
import {
  type AccountEntity,
  type RuleConditionEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/types/models';

import { type TableRef } from './Account';
import { Balances } from './Balance';
import { ReconcileMenu, ReconcilingMessage } from './Reconcile';

import { AnimatedRefresh } from '@desktop-client/components/AnimatedRefresh';
import { Search } from '@desktop-client/components/common/Search';
import { FilterButton } from '@desktop-client/components/filters/FiltersMenu';
import { FiltersStack } from '@desktop-client/components/filters/FiltersStack';
import { type SavedFilter } from '@desktop-client/components/filters/SavedFilterMenuButton';
import { NotesButton } from '@desktop-client/components/NotesButton';
import { SelectedTransactionsButton } from '@desktop-client/components/transactions/SelectedTransactionsButton';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useLocalPref } from '@desktop-client/hooks/useLocalPref';
import { useSplitsExpanded } from '@desktop-client/hooks/useSplitsExpanded';
import { useSyncServerStatus } from '@desktop-client/hooks/useSyncServerStatus';

type AccountHeaderProps = {
  tableRef: TableRef;
  isNameEditable: boolean;
  workingHard: boolean;
  accountName: string;
  account?: AccountEntity;
  filterId?: SavedFilter;
  savedFilters: TransactionFilterEntity[];
  accountsSyncing: string[];
  failedAccounts: AccountSyncSidebarProps['failedAccounts'];
  accounts: AccountEntity[];
  transactions: TransactionEntity[];
  showBalances: boolean;
  showExtraBalances: boolean;
  showCleared: boolean;
  showReconciled: boolean;
  showEmptyMessage: boolean;
  balanceQuery: ComponentProps<typeof ReconcilingMessage>['balanceQuery'];
  reconcileAmount?: number | null;
  canCalculateBalance?: () => boolean;
  isFiltered: boolean;
  filteredAmount?: number | null;
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
  onSync: () => void;
  onImport: () => void;
  onMenuSelect: AccountMenuProps['onMenuSelect'];
  onReconcile: ComponentProps<typeof ReconcileMenu>['onReconcile'];
  onBatchEdit: ComponentProps<typeof SelectedTransactionsButton>['onEdit'];
  onRunRules: ComponentProps<typeof SelectedTransactionsButton>['onRunRules'];
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
  | 'onMergeTransactions'
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
  isNameEditable,
  workingHard,
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
  balanceQuery,
  reconcileAmount,
  canCalculateBalance,
  isFiltered,
  filteredAmount,
  isSorted,
  search,
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
  onRunRules,
  onMakeAsSplitTransaction,
  onMakeAsNonSplitTransactions,
  onMergeTransactions,
}: AccountHeaderProps) {
  const { t } = useTranslation();

  const [reconcileOpen, setReconcileOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const reconcileRef = useRef(null);
  const splitsExpanded = useSplitsExpanded();
  const syncServerStatus = useSyncServerStatus();
  const isUsingServer = syncServerStatus !== 'no-server';
  const isServerOffline = syncServerStatus === 'offline';
  const [_, setExpandSplitsPref] = useLocalPref('expand-splits');

  const locale = useLocale();

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
              saveNameError={saveNameError}
              onSaveName={onSaveName}
            />
          </View>
        </View>

        <Balances
          balanceQuery={balanceQuery}
          showExtraBalances={showExtraBalances}
          onToggleExtraBalances={onToggleExtraBalances}
          account={account}
          isFiltered={isFiltered}
          filteredAmount={filteredAmount}
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
            onChange={onSearch}
            inputRef={searchInput}
            // Remove marginRight magically being added by Stack...
            // We need to refactor the Stack component
            style={{ marginRight: 0 }}
          />
          {workingHard ? (
            <View>
              <AnimatedLoading style={{ width: 16, height: 16 }} />
            </View>
          ) : (
            <SelectedTransactionsButton
              getTransaction={id => transactions.find(t => t.id === id)}
              onShow={onShowTransactions}
              onDuplicate={onBatchDuplicate}
              onDelete={onBatchDelete}
              onEdit={onBatchEdit}
              onRunRules={onRunRules}
              onLinkSchedule={onBatchLinkSchedule}
              onUnlinkSchedule={onBatchUnlinkSchedule}
              onCreateRule={onCreateRule}
              onSetTransfer={onSetTransfer}
              onScheduleAction={onScheduleAction}
              showMakeTransfer={showMakeTransfer}
              onMakeAsSplitTransaction={onMakeAsSplitTransaction}
              onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
              onMergeTransactions={onMergeTransactions}
            />
          )}
          <View style={{ flex: '0 0 auto', marginLeft: 10 }}>
            {account && (
              <Tooltip
                style={{
                  ...styles.tooltip,
                  marginBottom: 10,
                }}
                content={
                  account?.last_reconciled
                    ? `${t('Reconciled')} ${tsToRelativeTime(account.last_reconciled, locale)}`
                    : t('Not yet reconciled')
                }
                placement="top"
                triggerProps={{
                  isDisabled: reconcileOpen,
                }}
              >
                <Button
                  ref={reconcileRef}
                  variant="bare"
                  aria-label={t('Reconcile')}
                  style={{ padding: 6 }}
                  onPress={() => {
                    setReconcileOpen(true);
                  }}
                >
                  <View>
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
              </Tooltip>
            )}
          </View>
          <Button
            variant="bare"
            aria-label={
              splitsExpanded.state.mode === 'collapse'
                ? t('Collapse split transactions')
                : t('Expand split transactions')
            }
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
            <View style={{ flex: '0 0 auto' }}>
              <DialogTrigger>
                <Button variant="bare" aria-label={t('Account menu')}>
                  <SvgDotsHorizontalTriple
                    width={15}
                    height={15}
                    style={{ transform: 'rotateZ(90deg)' }}
                  />
                </Button>

                <Popover style={{ width: 275 }}>
                  <Dialog>
                    <AccountMenu
                      account={account}
                      canSync={canSync}
                      canShowBalances={
                        canCalculateBalance ? canCalculateBalance() : false
                      }
                      isSorted={isSorted}
                      showBalances={showBalances}
                      showCleared={showCleared}
                      showReconciled={showReconciled}
                      onMenuSelect={onMenuSelect}
                    />
                  </Dialog>
                </Popover>
              </DialogTrigger>
            </View>
          ) : (
            <View style={{ flex: '0 0 auto' }}>
              <DialogTrigger>
                <Button variant="bare" aria-label={t('Account menu')}>
                  <SvgDotsHorizontalTriple
                    width={15}
                    height={15}
                    style={{ transform: 'rotateZ(90deg)' }}
                  />
                </Button>

                <Popover>
                  <Dialog>
                    <Menu
                      slot="close"
                      onMenuSelect={onMenuSelect}
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
                  </Dialog>
                </Popover>
              </DialogTrigger>
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
  account?: AccountEntity;
  accountName: string;
  isNameEditable: boolean;
  saveNameError?: ReactNode;
  onSaveName: (newName: string) => void;
};

function AccountNameField({
  account,
  accountName,
  isNameEditable,
  saveNameError,
  onSaveName,
}: AccountNameFieldProps) {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);

  const handleSave = (newName: string) => {
    onSaveName(newName);
    setEditingName(false);
  };

  if (editingName) {
    return (
      <>
        <InitialFocus>
          <Input
            defaultValue={accountName}
            onEnter={handleSave}
            onUpdate={handleSave}
            onEscape={() => setEditingName(false)}
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
      </>
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
            onPress={() => setEditingName(true)}
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
  canShowBalances: boolean;
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
  canShowBalances,
  showCleared,
  showReconciled,
  isSorted,
  onMenuSelect,
}: AccountMenuProps) {
  const { t } = useTranslation();
  const syncServerStatus = useSyncServerStatus();

  return (
    <Menu
      slot="close"
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
        ...(canShowBalances
          ? [
              {
                name: 'toggle-balance',
                text: showBalances
                  ? t('Hide running balance')
                  : t('Show running balance'),
              } as const,
            ]
          : []),
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
