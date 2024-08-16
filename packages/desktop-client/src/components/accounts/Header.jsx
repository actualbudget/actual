import React, { useState, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { useLocalPref } from '../../hooks/useLocalPref';
import { useSplitsExpanded } from '../../hooks/useSplitsExpanded';
import { useSyncServerStatus } from '../../hooks/useSyncServerStatus';
import { AnimatedLoading } from '../../icons/AnimatedLoading';
import { SvgAdd } from '../../icons/v1';
import {
  SvgArrowsExpand3,
  SvgArrowsShrink3,
  SvgDownloadThickBottom,
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
import { NotesButton } from '../NotesButton';
import { SelectedTransactionsButton } from '../transactions/SelectedTransactionsButton';

import { Balances } from './Balance';
import { ReconcilingMessage, ReconcileMenu } from './Reconcile';

export function AccountHeader({
  tableRef,
  editingName,
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
  pushModal,
  onSearch,
  onAddTransaction,
  onShowTransactions,
  onDoneReconciling,
  onCreateReconciliationTransaction,
  onToggleExtraBalances,
  onSaveName,
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
}) {
  const { t } = useTranslation();

  const [menuOpen, setMenuOpen] = useState(false);
  const searchInput = useRef(null);
  const triggerRef = useRef(null);
  const splitsExpanded = useSplitsExpanded();
  const syncServerStatus = useSyncServerStatus();
  const isUsingServer = syncServerStatus !== 'no-server';
  const isServerOffline = syncServerStatus === 'offline';
  const [_, setExpandSplitsPref] = useLocalPref('expand-splits');

  let canSync = account && account.account_id && isUsingServer;
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
            )}
            {editingName ? (
              <InitialFocus>
                <Input
                  defaultValue={accountName}
                  onEnter={e => onSaveName(e.target.value)}
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
            ) : isNameEditable ? (
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
                    ? t('Closed: ') + accountName
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
            ) : (
              <View
                style={{ fontSize: 25, fontWeight: 500, marginBottom: -1 }}
                data-testid="account-name"
              >
                {account && account.closed
                  ? t('Closed: ') + accountName
                  : accountName}
              </View>
            )}
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
          {((account && !account.closed) || canSync) && (
            <Button
              variant="bare"
              onPress={canSync ? onSync : onImport}
              isDisabled={canSync && isServerOffline}
            >
              {canSync ? (
                <>
                  <AnimatedRefresh
                    width={13}
                    height={13}
                    animating={
                      account
                        ? accountsSyncing.includes(account.id)
                        : accountsSyncing.length > 0
                    }
                    style={{ marginRight: 4 }}
                  />{' '}
                  {isServerOffline ? t('Bank Sync Offline') : t('Bank Sync')}
                </>
              ) : (
                <>
                  <SvgDownloadThickBottom
                    width={13}
                    height={13}
                    style={{ marginRight: 4 }}
                  />{' '}
                  <Trans>Import</Trans>
                </>
              )}
            </Button>
          )}
          {!showEmptyMessage && (
            <Button variant="bare" onPress={onAddTransaction}>
              <SvgAdd width={10} height={10} style={{ marginRight: 3 }} />
              <Trans>Add New</Trans>
            </Button>
          )}
          <View style={{ flexShrink: 0 }}>
            <FilterButton onApply={onApplyFilter} type="accounts" />
          </View>
          <View style={{ flex: 1 }} />
          <Search
            placeholder={t('Search')}
            value={search}
            onChange={onSearch}
            inputRef={searchInput}
          />
          {workingHard ? (
            <View>
              <AnimatedLoading style={{ width: 16, height: 16 }} />
            </View>
          ) : (
            <SelectedTransactionsButton
              account={account}
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
              pushModal={pushModal}
              showMakeTransfer={showMakeTransfer}
              onMakeAsSplitTransaction={onMakeAsSplitTransaction}
              onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
            />
          )}
          <Button
            variant="bare"
            aria-label={
              splitsExpanded.state.mode === 'collapse'
                ? t('Collapse split transactions')
                : t('Expand split transactions')
            }
            isDisabled={search !== '' || filterConditions.length > 0}
            style={{ padding: 6, marginLeft: 10 }}
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
                  canShowBalances={canCalculateBalance()}
                  isSorted={isSorted}
                  showBalances={showBalances}
                  showCleared={showCleared}
                  showReconciled={showReconciled}
                  onMenuSelect={item => {
                    setMenuOpen(false);
                    onMenuSelect(item);
                  }}
                  onReconcile={onReconcile}
                  onClose={() => setMenuOpen(false)}
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
                    isSorted && {
                      name: 'remove-sorting',
                      text: t('Remove all sorting'),
                    },
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
          targetBalance={reconcileAmount}
          balanceQuery={balanceQuery}
          onDone={onDoneReconciling}
          onCreateTransaction={onCreateReconciliationTransaction}
        />
      )}
    </>
  );
}

function AccountMenu({
  account,
  canSync,
  showBalances,
  canShowBalances,
  showCleared,
  showReconciled,
  onClose,
  isSorted,
  onReconcile,
  onMenuSelect,
}) {
  const { t } = useTranslation();

  const [tooltip, setTooltip] = useState('default');
  const syncServerStatus = useSyncServerStatus();

  return tooltip === 'reconcile' ? (
    <ReconcileMenu
      account={account}
      onClose={onClose}
      onReconcile={onReconcile}
    />
  ) : (
    <Menu
      onMenuSelect={item => {
        if (item === 'reconcile') {
          setTooltip('reconcile');
        } else {
          onMenuSelect(item);
        }
      }}
      items={[
        isSorted && {
          name: 'remove-sorting',
          text: t('Remove all sorting'),
        },
        canShowBalances && {
          name: 'toggle-balance',
          text: (showBalances ? t('Hide') : t('Show')) + t(' running balance'),
        },
        {
          name: 'toggle-cleared',
          text:
            (showCleared ? t('Hide') : t('Show')) + t(' “cleared” checkboxes'),
        },
        {
          name: 'toggle-reconciled',
          text:
            (showReconciled ? t('Hide') : t('Show')) +
            t(' reconciled transactions'),
        },
        { name: 'export', text: t('Export') },
        { name: 'reconcile', text: t('Reconcile') },
        account &&
          !account.closed &&
          (canSync
            ? {
                name: 'unlink',
                text: t('Unlink account'),
              }
            : syncServerStatus === 'online' && {
                name: 'link',
                text: t('Link account'),
              }),
        account.closed
          ? { name: 'reopen', text: t('Reopen account') }
          : { name: 'close', text: t('Close account') },
      ].filter(x => x)}
    />
  );
}
