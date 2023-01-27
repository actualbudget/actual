import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Redirect, useParams, useHistory, useLocation } from 'react-router-dom';

import { debounce } from 'debounce';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import {
  SchedulesProvider,
  useCachedSchedules
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import q, { runQuery, pagedQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { currentDay } from 'loot-core/src/shared/months';
import {
  deleteTransaction,
  updateTransaction,
  realizeTempTransactions,
  ungroupTransactions
} from 'loot-core/src/shared/transactions';
import {
  currencyToInteger,
  applyChanges,
  groupById
} from 'loot-core/src/shared/util';
import {
  View,
  Text,
  Button,
  Input,
  InputWithContent,
  InitialFocus,
  Tooltip,
  Menu,
  Stack
} from 'loot-design/src/components/common';
import { KeyHandlers } from 'loot-design/src/components/KeyHandlers';
import NotesButton from 'loot-design/src/components/NotesButton';
import CellValue from 'loot-design/src/components/spreadsheet/CellValue';
import format from 'loot-design/src/components/spreadsheet/format';
import useSheetValue from 'loot-design/src/components/spreadsheet/useSheetValue';
import { SelectedItemsButton } from 'loot-design/src/components/table';
import {
  SelectedProviderWithItems,
  useSelectedItems
} from 'loot-design/src/components/useSelected';
import { styles, colors } from 'loot-design/src/style';
import Loading from 'loot-design/src/svg/AnimatedLoading';
import Add from 'loot-design/src/svg/v1/Add';
import DotsHorizontalTriple from 'loot-design/src/svg/v1/DotsHorizontalTriple';
import ArrowButtonRight1 from 'loot-design/src/svg/v2/ArrowButtonRight1';
import ArrowsExpand3 from 'loot-design/src/svg/v2/ArrowsExpand3';
import ArrowsShrink3 from 'loot-design/src/svg/v2/ArrowsShrink3';
import CheckCircle1 from 'loot-design/src/svg/v2/CheckCircle1';
import DownloadThickBottom from 'loot-design/src/svg/v2/DownloadThickBottom';
import Pencil1 from 'loot-design/src/svg/v2/Pencil1';
import SearchAlternate from 'loot-design/src/svg/v2/SearchAlternate';

import { authorizeBank } from '../../plaid';
import { useActiveLocation } from '../ActiveLocation';
import AnimatedRefresh from '../AnimatedRefresh';

import { FilterButton, AppliedFilters } from './Filters';
import TransactionList from './TransactionList';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
  isPreviewId
} from './TransactionsTable';

function EmptyMessage({ onAdd }) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: colors.n9
      }}
    >
      <View
        style={{
          width: 550,
          marginTop: 75,
          fontSize: 15,
          alignItems: 'center'
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.4em' }}>
          For Actual to be useful, you need to <strong>add an account</strong>.
          You can link an account to automatically download transactions, or
          manage it locally yourself.
        </Text>

        <Button primary style={{ marginTop: 20 }} onClick={onAdd}>
          Add account
        </Button>

        <View style={{ marginTop: 20, fontSize: 13, color: colors.n5 }}>
          In the future, you can add accounts from the sidebar.
        </View>
      </View>
    </View>
  );
}

function ReconcilingMessage({
  balanceQuery,
  targetBalance,
  onDone,
  onCreateTransaction
}) {
  let cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    value: 0,
    query: balanceQuery.query.filter({ cleared: true })
  });
  let targetDiff = targetBalance - cleared;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: 'center',
        backgroundColor: 'white',
        ...styles.shadow,
        borderRadius: 4,
        marginTop: 5,
        marginBottom: 15,
        padding: 10
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {targetDiff === 0 ? (
          <View
            style={{
              color: colors.g4,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle1
              style={{
                width: 13,
                height: 13,
                color: colors.g5,
                marginRight: 3
              }}
            />
            All reconciled!
          </View>
        ) : (
          <View style={{ color: colors.n3 }}>
            <Text style={{ fontStyle: 'italic', textAlign: 'center' }}>
              Your cleared balance{' '}
              <strong>{format(cleared, 'financial')}</strong> needs{' '}
              <strong>
                {(targetDiff > 0 ? '+' : '') + format(targetDiff, 'financial')}
              </strong>{' '}
              to match
              <br /> your bank{"'"}s balance of{' '}
              <Text style={{ fontWeight: 700 }}>
                {format(targetBalance, 'financial')}
              </Text>
            </Text>
          </View>
        )}
        <View style={{ marginLeft: 15 }}>
          <Button primary onClick={onDone}>
            Done Reconciling
          </Button>
        </View>
        {targetDiff !== 0 && (
          <View style={{ marginLeft: 15 }}>
            <Button onClick={() => onCreateTransaction(targetDiff)}>
              Create Reconciliation Transaction
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}

function ReconcileTooltip({ account, onReconcile, onClose }) {
  let balance = useSheetValue(queries.accountBalance(account));

  function onSubmit(e) {
    let input = e.target.elements[0];
    let amount = currencyToInteger(input.value);
    onReconcile(amount == null ? balance : amount);
    onClose();
  }

  return (
    <Tooltip position="bottom-right" width={275} onClose={onClose}>
      <View style={{ padding: '5px 8px' }}>
        <Text>
          Enter the current balance of your bank account that you want to
          reconcile with:
        </Text>
        <form onSubmit={onSubmit}>
          {balance != null && (
            <InitialFocus>
              <Input
                defaultValue={format(balance, 'financial')}
                style={{ margin: '7px 0' }}
              />
            </InitialFocus>
          )}
          <Button primary>Reconcile</Button>
        </form>
      </View>
    </Tooltip>
  );
}

function MenuButton({ onClick }) {
  return (
    <Button bare onClick={onClick}>
      <DotsHorizontalTriple
        width={15}
        height={15}
        style={{ color: 'inherit', transform: 'rotateZ(90deg)' }}
      />
    </Button>
  );
}

function MenuTooltip({ onClose, children }) {
  return (
    <Tooltip
      position="bottom-right"
      width={200}
      style={{ padding: 0 }}
      onClose={onClose}
    >
      {children}
    </Tooltip>
  );
}

function AccountMenu({
  account,
  canSync,
  syncEnabled,
  showBalances,
  canShowBalances,
  onClose,
  onReconcile,
  onMenuSelect
}) {
  let [tooltip, setTooltip] = useState('default');

  return tooltip === 'reconcile' ? (
    <ReconcileTooltip
      account={account}
      onClose={onClose}
      onReconcile={onReconcile}
    />
  ) : (
    <MenuTooltip onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          if (item === 'reconcile') {
            setTooltip('reconcile');
          } else {
            onMenuSelect(item);
          }
        }}
        items={[
          canShowBalances && {
            name: 'toggle-balance',
            text: (showBalances ? 'Hide' : 'Show') + ' Running Balance'
          },
          { name: 'export', text: 'Export' },
          { name: 'reconcile', text: 'Reconcile' },
          syncEnabled &&
            account &&
            !account.closed &&
            (canSync
              ? { name: 'unlink', text: 'Unlink Account' }
              : { name: 'link', text: 'Link Account' }),
          account.closed
            ? { name: 'reopen', text: 'Reopen Account' }
            : { name: 'close', text: 'Close Account' }
        ].filter(x => x)}
      />
    </MenuTooltip>
  );
}

function CategoryMenu({ onClose, onMenuSelect }) {
  return (
    <MenuTooltip onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={[{ name: 'export', text: 'Export' }]}
      />
    </MenuTooltip>
  );
}

function DetailedBalance({ name, balance }) {
  return (
    <Text
      style={{
        marginLeft: 15,
        backgroundColor: colors.n10,
        borderRadius: 4,
        padding: '4px 6px',
        color: colors.n5
      }}
    >
      {name}{' '}
      <Text style={{ fontWeight: 600 }}>{format(balance, 'financial')}</Text>
    </Text>
  );
}

function SelectedBalance({ selectedItems }) {
  let [balance, setBalance] = useState(null);

  useEffect(() => {
    async function run() {
      let { data: rows } = await runQuery(
        q('transactions')
          .filter({
            id: { $oneof: [...selectedItems] },
            parent_id: { $oneof: [...selectedItems] }
          })
          .select('id')
      );
      let ids = new Set(rows.map(r => r.id));

      let finalIds = [...selectedItems].filter(id => !ids.has(id));
      let { data: balance } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: finalIds } })
          .options({ splits: 'all' })
          .calculate({ $sum: '$amount' })
      );
      setBalance(balance);
    }
    run();
  }, [selectedItems]);

  if (balance == null) {
    return null;
  }
  return <DetailedBalance name="Selected balance:" balance={balance} />;
}

function MoreBalances({ balanceQuery }) {
  let cleared = useSheetValue({
    name: balanceQuery.name + '-cleared',
    query: balanceQuery.query.filter({ cleared: true })
  });
  let uncleared = useSheetValue({
    name: balanceQuery.name + '-uncleared',
    query: balanceQuery.query.filter({ cleared: false })
  });

  return (
    <View style={{ flexDirection: 'row' }}>
      <DetailedBalance name="Cleared total:" balance={cleared} />
      <DetailedBalance name="Uncleared total:" balance={uncleared} />
    </View>
  );
}

function Balances({ balanceQuery, showExtraBalances, onToggleExtraBalances }) {
  let selectedItems = useSelectedItems();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: -5,
        marginLeft: -5
      }}
    >
      <Button
        bare
        onClick={onToggleExtraBalances}
        style={{
          '& svg': {
            opacity: selectedItems.size > 0 || showExtraBalances ? 1 : 0
          },
          '&:hover svg': { opacity: 1 }
        }}
      >
        <CellValue
          binding={{ ...balanceQuery, value: 0 }}
          type="financial"
          style={{ fontSize: 22, fontWeight: 400 }}
          getStyle={value => ({
            color: value < 0 ? colors.r5 : value > 0 ? colors.g5 : colors.n8
          })}
        />

        <ArrowButtonRight1
          style={{
            width: 10,
            height: 10,
            marginLeft: 10,
            color: colors.n5,
            transform: showExtraBalances ? 'rotateZ(180deg)' : 'rotateZ(0)'
          }}
        />
      </Button>
      {showExtraBalances && <MoreBalances balanceQuery={balanceQuery} />}

      {selectedItems.size > 0 && (
        <SelectedBalance selectedItems={selectedItems} />
      )}
    </View>
  );
}

// function ScheduleMenu({ onSelect, onClose }) {
//   let params = useParams();
//   let scheduleData = useCachedSchedules();
//   let payees = useSelector(state => state.queries.payees);
//   let byId = getPayeesById(payees);

//   if (scheduleData == null) {
//     return null;
//   }

//   return (
//     <Tooltip
//       position="bottom-right"
//       width={200}
//       style={{ padding: 0 }}
//       onClose={onClose}
//     >
//       <Menu
//         onMenuSelect={name => {
//           onSelect(name);
//           onClose();
//         }}
//         items={scheduleData.schedules.map(s => {
//           let desc = s._payee
//             ? `${byId[s._payee].name} (${s.next_date})`
//             : `No payee (${s.next_date})`;

//           return { name: s.id, text: desc };
//         })}
//       />
//     </Tooltip>
//   );
// }

function SelectedTransactionsButton({
  style,
  getTransaction,
  onShow,
  onDelete,
  onEdit,
  onUnlink,
  onScheduleAction
}) {
  let selectedItems = useSelectedItems();
  let history = useHistory();

  let types = useMemo(() => {
    let items = [...selectedItems];
    return {
      preview: !!items.find(id => isPreviewId(id)),
      trans: !!items.find(id => !isPreviewId(id))
    };
  }, [selectedItems]);

  let linked = useMemo(() => {
    return (
      !types.preview &&
      [...selectedItems].every(id => {
        let t = getTransaction(id);
        return t && t.schedule;
      })
    );
  }, [types.preview, selectedItems, getTransaction]);

  return (
    <SelectedItemsButton
      name="transactions"
      keyHandlers={
        types.trans && {
          f: () => onShow([...selectedItems]),
          d: () => onDelete([...selectedItems]),
          a: () => onEdit('account', [...selectedItems]),
          p: () => onEdit('payee', [...selectedItems]),
          n: () => onEdit('notes', [...selectedItems]),
          c: () => onEdit('category', [...selectedItems]),
          l: () => onEdit('cleared', [...selectedItems])
        }
      }
      items={[
        ...(!types.trans
          ? [
              { name: 'view-schedule', text: 'View schedule' },
              { name: 'post-transaction', text: 'Post transaction' },
              { name: 'skip', text: 'Skip scheduled date' }
            ]
          : [
              { name: 'show', text: 'Show', key: 'F' },
              { name: 'delete', text: 'Delete', key: 'D' },
              ...(linked
                ? [
                    {
                      name: 'view-schedule',
                      text: 'View schedule',
                      disabled: selectedItems.size > 1
                    },
                    { name: 'unlink-schedule', text: 'Unlink schedule' }
                  ]
                : [
                    {
                      name: 'link-schedule',
                      text: 'Link schedule'
                    }
                  ]),
              Menu.line,
              { type: Menu.label, name: 'Edit field' },
              { name: 'date', text: 'Date' },
              { name: 'account', text: 'Account', key: 'A' },
              { name: 'payee', text: 'Payee', key: 'P' },
              { name: 'notes', text: 'Notes', key: 'N' },
              { name: 'category', text: 'Category', key: 'C' },
              { name: 'amount', text: 'Amount' },
              { name: 'cleared', text: 'Cleared', key: 'L' }
            ])
      ]}
      onSelect={name => {
        switch (name) {
          case 'show':
            onShow([...selectedItems]);
            break;
          case 'delete':
            onDelete([...selectedItems]);
            break;
          case 'post-transaction':
          case 'skip':
            onScheduleAction(name, selectedItems);
            break;
          case 'view-schedule':
            let firstId = [...selectedItems][0];
            let scheduleId;
            if (isPreviewId(firstId)) {
              let parts = firstId.split('/');
              scheduleId = parts[1];
            } else {
              let trans = getTransaction(firstId);
              scheduleId = trans && trans.schedule;
            }

            if (scheduleId) {
              history.push(`/schedule/edit/${scheduleId}`, {
                locationPtr: history.location
              });
            }
            break;
          case 'link-schedule':
            history.push(`/schedule/link`, {
              locationPtr: history.location,
              transactionIds: [...selectedItems]
            });
            break;
          case 'unlink-schedule':
            onUnlink([...selectedItems]);
            break;
          default:
            onEdit(name, [...selectedItems]);
        }
      }}
    ></SelectedItemsButton>
  );
}

const AccountHeader = React.memo(
  ({
    tableRef,
    editingName,
    isNameEditable,
    workingHard,
    accountName,
    account,
    accountsSyncing,
    accounts,
    transactions,
    syncEnabled,
    showBalances,
    showExtraBalances,
    showEmptyMessage,
    balanceQuery,
    reconcileAmount,
    canCalculateBalance,
    search,
    filters,
    savePrefs,
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
    onBatchEdit,
    onBatchUnlink,
    onApplyFilter,
    onDeleteFilter,
    onScheduleAction
  }) => {
    let [menuOpen, setMenuOpen] = useState(false);
    let searchInput = useRef(null);
    let splitsExpanded = useSplitsExpanded();

    let canSync = syncEnabled && account && account.account_id;
    if (!account) {
      // All accounts - check for any syncable account
      canSync = !!accounts.find(account => !!account.account_id);
    }

    function onToggleSplits() {
      if (tableRef.current) {
        splitsExpanded.dispatch({
          type: 'switch-mode',
          id: tableRef.current.getScrolledItem()
        });

        savePrefs({
          'expand-splits': !(splitsExpanded.state.mode === 'expand')
        });
      }
    }

    return (
      <>
        <KeyHandlers
          keys={{
            'mod+f': () => {
              if (searchInput.current) {
                searchInput.current.focus();
              }
            }
          }}
        />

        <View
          style={[styles.pageContent, { paddingBottom: 10, flexShrink: 0 }]}
        >
          <View style={{ marginTop: 2, alignItems: 'flex-start' }}>
            <View>
              {editingName ? (
                <InitialFocus>
                  <Input
                    defaultValue={accountName}
                    onEnter={e => onSaveName(e.target.value)}
                    onBlur={() => onExposeName(false)}
                    style={{
                      fontSize: 25,
                      fontWeight: 500,
                      marginTop: -5,
                      marginBottom: -2,
                      marginLeft: -5
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
                      transition: 'opacity .25s'
                    },
                    '&:hover .hover-visible': {
                      opacity: 1
                    }
                  }}
                >
                  <View
                    style={{
                      fontSize: 25,
                      fontWeight: 500,
                      marginRight: 5,
                      marginBottom: 5
                    }}
                  >
                    {accountName}
                  </View>

                  <NotesButton id={`account-${account.id}`} />
                  <Button
                    bare
                    className="hover-visible"
                    onClick={() => onExposeName(true)}
                  >
                    <Pencil1
                      style={{
                        width: 11,
                        height: 11,
                        color: colors.n8
                      }}
                    />
                  </Button>
                </View>
              ) : (
                <View
                  style={{ fontSize: 25, fontWeight: 500, marginBottom: 5 }}
                >
                  {accountName}
                </View>
              )}
            </View>
          </View>

          <Balances
            balanceQuery={balanceQuery}
            showExtraBalances={showExtraBalances}
            onToggleExtraBalances={onToggleExtraBalances}
          />

          <Stack
            spacing={2}
            direction="row"
            align="center"
            style={{ marginTop: 12 }}
          >
            {((account && !account.closed) || canSync) && (
              <Button bare onClick={canSync ? onSync : onImport}>
                {canSync ? (
                  <>
                    <AnimatedRefresh
                      width={13}
                      height={13}
                      animating={
                        (account && accountsSyncing === account.name) ||
                        accountsSyncing === '__all'
                      }
                      style={{ color: 'currentColor', marginRight: 4 }}
                    />{' '}
                    Sync
                  </>
                ) : (
                  <>
                    <DownloadThickBottom
                      width={13}
                      height={13}
                      style={{ color: 'currentColor', marginRight: 4 }}
                    />{' '}
                    Import
                  </>
                )}
              </Button>
            )}
            {!showEmptyMessage && (
              <Button bare onClick={onAddTransaction}>
                <Add
                  width={10}
                  height={10}
                  style={{ color: 'inherit', marginRight: 3 }}
                />{' '}
                Add New
              </Button>
            )}
            <View>
              <FilterButton onApply={onApplyFilter} />
            </View>
            <InputWithContent
              leftContent={
                <SearchAlternate
                  style={{
                    width: 13,
                    height: 13,
                    flexShrink: 0,
                    color: search ? colors.p7 : 'inherit',
                    margin: 5,
                    marginRight: 0
                  }}
                />
              }
              inputRef={searchInput}
              value={search}
              placeholder="Search"
              getStyle={focused => [
                {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  boxShadow: 'none',
                  transition: 'color .15s',
                  '& input::placeholder': {
                    color: colors.n1,
                    transition: 'color .25s'
                  }
                },
                focused && { boxShadow: '0 0 0 2px ' + colors.b5 },
                !focused && search !== '' && { color: colors.p4 }
              ]}
              onChange={e => onSearch(e.target.value)}
            />
            {workingHard ? (
              <View>
                <Loading color={colors.n1} style={{ width: 16, height: 16 }} />
              </View>
            ) : (
              <SelectedTransactionsButton
                getTransaction={id => transactions.find(t => t.id === id)}
                onShow={onShowTransactions}
                onDelete={onBatchDelete}
                onEdit={onBatchEdit}
                onUnlink={onBatchUnlink}
                onScheduleAction={onScheduleAction}
              />
            )}
            <Button
              bare
              disabled={search !== '' || filters.length > 0}
              style={{ padding: 6 }}
              onClick={onToggleSplits}
              title={
                splitsExpanded.state.mode === 'collapse'
                  ? 'Collapse split transactions'
                  : 'Expand split transactions'
              }
            >
              {splitsExpanded.state.mode === 'collapse' ? (
                <ArrowsShrink3
                  style={{
                    width: 14,
                    height: 14,
                    color: 'inherit'
                  }}
                />
              ) : (
                <ArrowsExpand3
                  style={{
                    width: 14,
                    height: 14,
                    color: 'inherit'
                  }}
                />
              )}
            </Button>
            {account ? (
              <View>
                <MenuButton onClick={() => setMenuOpen(true)} />

                {menuOpen && (
                  <AccountMenu
                    account={account}
                    canSync={canSync}
                    syncEnabled={syncEnabled}
                    canShowBalances={canCalculateBalance()}
                    showBalances={showBalances}
                    onMenuSelect={item => {
                      setMenuOpen(false);
                      onMenuSelect(item);
                    }}
                    onReconcile={onReconcile}
                    onClose={() => setMenuOpen(false)}
                  />
                )}
              </View>
            ) : (
              <View>
                <MenuButton onClick={() => setMenuOpen(true)} />

                {menuOpen && (
                  <CategoryMenu
                    onMenuSelect={item => {
                      setMenuOpen(false);
                      onMenuSelect(item);
                    }}
                    onClose={() => setMenuOpen(false)}
                  />
                )}
              </View>
            )}
          </Stack>

          {filters && filters.length > 0 && (
            <AppliedFilters filters={filters} onDelete={onDeleteFilter} />
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
);

function AllTransactions({ transactions, filtered, children }) {
  let scheduleData = useCachedSchedules();

  let schedules = useMemo(
    () =>
      scheduleData
        ? scheduleData.schedules.filter(
            s =>
              !s.completed &&
              ['due', 'upcoming', 'missed'].includes(
                scheduleData.statuses.get(s.id)
              )
          )
        : [],
    [scheduleData]
  );

  let prependTransactions = useMemo(() => {
    return schedules.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      notes: scheduleData.statuses.get(schedule.id),
      schedule: schedule.id
    }));
  }, [schedules]);

  let allTransactions = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependTransactions.length > 0) {
      return prependTransactions.concat(transactions);
    }
    return transactions;
  }, [filtered, prependTransactions, transactions]);

  if (scheduleData == null) {
    return children(null);
  }
  return children(allTransactions);
}

class AccountInternal extends React.PureComponent {
  constructor(props) {
    super(props);
    this.paged = null;
    this.table = React.createRef();
    this.animated = true;

    this.state = {
      search: '',
      filters: [],
      loading: true,
      workingHard: false,
      reconcileAmount: null,
      transactions: [],
      transactionsCount: 0,
      showBalances: props.showBalances,
      balances: [],
      editingName: false,
      isAdding: false,
      latestDate: null
    };
  }

  async componentDidMount() {
    let maybeRefetch = tables => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        return this.refetchTransactions();
      }
    };

    let onUndo = async ({ tables, messages, undoTag }) => {
      await maybeRefetch(tables);

      // If all the messages are dealing with transactions, find the
      // first message referencing a non-deleted row so that we can
      // highlight the row
      //
      let focusId;
      if (
        messages.every(msg => msg.dataset === 'transactions') &&
        !messages.find(msg => msg.column === 'tombstone')
      ) {
        let focusableMsgs = messages.filter(
          msg => msg.dataset === 'transactions' && !(msg.column === 'tombstone')
        );

        focusId = focusableMsgs.length === 1 ? focusableMsgs[0].row : null;

        // Highlight the transactions
        // this.table && this.table.highlight(focusableMsgs.map(msg => msg.row));
      }

      if (this.table.current) {
        this.table.current.edit(null);

        // Focus a transaction if applicable. There is a chance if the
        // user navigated away that focusId is a transaction that has
        // been "paged off" and we won't focus it. That's ok, we just
        // do our best.
        if (focusId) {
          this.table.current.scrollTo(focusId);
        }
      }

      this.props.setLastUndoState(null);
    };

    let unlistens = [listen('undo-event', onUndo)];

    this.unlisten = () => {
      unlistens.forEach(unlisten => unlisten());
    };

    // Important that any async work happens last so that the
    // listeners are set up synchronously
    if (this.props.categoryGroups.length === 0) {
      await this.props.getCategories();
    }
    await this.props.initiallyLoadPayees();
    await this.fetchTransactions();

    // If there is a pending undo, apply it immediately (this happens
    // when an undo changes the location to this page)
    if (this.props.lastUndoState && this.props.lastUndoState.current) {
      onUndo(this.props.lastUndoState.current);
    }
  }

  componentDidUpdate(prevProps) {
    // If the user was on a different screen and is now coming back to
    // the transactions, automatically refresh the transaction to make
    // sure we have updated state
    if (prevProps.modalShowing && !this.props.modalShowing) {
      // This is clearly a hack. Need a better way to track which
      // things are listening to transactions and refetch
      // automatically (use ActualQL?)
      setTimeout(() => {
        this.refetchTransactions();
      }, 100);
    }
  }

  componentWillUnmount() {
    if (this.unlisten) {
      this.unlisten();
    }
    if (this.paged) {
      this.paged.unsubscribe();
    }
  }

  fetchAllIds = async () => {
    let { data } = await runQuery(this.paged.getQuery().select('id'));
    // Remember, this is the `grouped` split type so we need to deal
    // with the `subtransactions` property
    return data.reduce((arr, t) => {
      arr.push(t.id);
      t.subtransactions.forEach(sub => arr.push(sub.id));
      return arr;
    }, []);
  };

  refetchTransactions = async () => {
    this.paged && this.paged.run();
  };

  fetchTransactions = () => {
    let query = this.makeRootQuery();
    this.rootQuery = this.currentQuery = query;
    this.updateQuery(query);

    if (this.props.accountId) {
      this.props.markAccountRead(this.props.accountId);
    }
  };

  makeRootQuery = () => {
    let locationState = this.props.location.state;
    let accountId = this.props.accountId;

    if (locationState && locationState.filter) {
      return q('transactions')
        .options({ splits: 'grouped' })
        .filter({
          'account.offbudget': false,
          ...locationState.filter
        });
    }

    return queries.makeTransactionsQuery(accountId);
  };

  updateQuery(query, isFiltered) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    this.paged = pagedQuery(
      query.select('*'),
      async (data, prevData) => {
        const firstLoad = prevData == null;

        if (firstLoad) {
          this.table.current && this.table.current.setRowAnimation(false);

          if (isFiltered) {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: 'collapse'
            });
          } else {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: this.props.expandSplits ? 'expand' : 'collapse'
            });
          }
        }

        this.setState(
          {
            transactions: data,
            transactionCount: this.paged.getTotalCount(),
            transactionsFiltered: isFiltered,
            loading: false,
            workingHard: false
          },
          () => {
            if (this.state.showBalances) {
              this.calculateBalances();
            }

            if (firstLoad) {
              this.table.current && this.table.current.scrollToTop();
            }

            setTimeout(() => {
              this.table.current && this.table.current.setRowAnimation(true);
            }, 0);
          }
        );
      },
      {
        pageCount: 150,
        onlySync: true,
        mapper: ungroupTransactions
      }
    );
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.match !== nextProps.match) {
      this.setState(
        {
          editingName: false,
          loading: true,
          search: '',
          showBalances: nextProps.showBalances,
          balances: []
        },
        () => {
          this.fetchTransactions();
        }
      );
    }
  }

  onSearch = value => {
    this.paged.unsubscribe();
    this.setState({ search: value }, this.onSearchDone);
  };

  onSearchDone = debounce(() => {
    if (this.state.search === '') {
      this.updateQuery(this.currentQuery, this.state.filters.length > 0);
    } else {
      this.updateQuery(
        queries.makeTransactionSearchQuery(
          this.currentQuery,
          this.state.search,
          this.props.dateFormat
        ),
        true
      );
    }
  }, 150);

  onSync = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    await this.props.syncAndDownload(account ? account.id : null);
  };

  onImport = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    if (account) {
      const res = await window.Actual.openFileDialog({
        filters: [
          { name: 'Financial Files', extensions: ['qif', 'ofx', 'qfx', 'csv'] }
        ]
      });

      if (res) {
        this.props.pushModal('import-transactions', {
          accountId,
          filename: res[0],
          onImported: didChange => {
            if (didChange) {
              this.fetchTransactions();
            }
          }
        });
      }
    }
  };

  onExport = async accountName => {
    let exportedTransactions = await send('transactions-export-query', {
      query: this.currentQuery.serialize()
    });
    let normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    let filename = `${normalizedName || 'transactions'}.csv`;

    window.Actual.saveFile(
      exportedTransactions,
      filename,
      'Export Transactions'
    );
  };

  onTransactionsChange = (newTransaction, data) => {
    // Apply changes to pagedQuery data
    this.paged.optimisticUpdate(
      data => {
        if (newTransaction._deleted) {
          return data.filter(t => t.id !== newTransaction.id);
        } else {
          return data.map(t => {
            return t.id === newTransaction.id ? newTransaction : t;
          });
        }
      },
      mappedData => {
        return data;
      }
    );

    this.props.updateNewTransactions(newTransaction.id);
  };

  canCalculateBalance = () => {
    let accountId = this.props.accountId;
    let account = this.props.accounts.find(account => account.id === accountId);
    return (
      account && this.state.search === '' && this.state.filters.length === 0
    );
  };

  async calculateBalances() {
    if (!this.canCalculateBalance()) {
      return;
    }

    let { data } = await runQuery(
      this.paged
        .getQuery()
        .options({ splits: 'none' })
        .select([{ balance: { $sumOver: '$amount' } }])
    );

    this.setState({ balances: groupById(data) });
  }

  onAddTransaction = () => {
    this.setState({ isAdding: true });
  };

  onExposeName = flag => {
    this.setState({ editingName: flag });
  };

  onSaveName = name => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId
    );
    this.props.updateAccount({ ...account, name });
    this.setState({ editingName: false });
  };

  onToggleExtraBalances = () => {
    let { accountId, showExtraBalances } = this.props;
    let key = 'show-extra-balances-' + accountId;

    this.props.savePrefs({ [key]: !showExtraBalances });
  };

  onMenuSelect = async item => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId
    );

    switch (item) {
      case 'link':
        authorizeBank(this.props.pushModal, { upgradingId: accountId });
        break;
      case 'unlink':
        this.props.unlinkAccount(accountId);
        break;
      case 'close':
        this.props.openAccountCloseModal(accountId);
        break;
      case 'reopen':
        this.props.reopenAccount(accountId);
        break;
      case 'export':
        const accountName = this.getAccountTitle(account, accountId);
        this.onExport(accountName);
        break;
      case 'toggle-balance':
        if (this.state.showBalances) {
          this.props.savePrefs({ ['show-balances-' + accountId]: false });
          this.setState({ showBalances: false, balances: [] });
        } else {
          this.props.savePrefs({ ['show-balances-' + accountId]: true });
          this.setState({ showBalances: true });
          this.calculateBalances();
        }
        break;
      default:
    }
  };

  getAccountTitle(account, id) {
    let { filterName } = this.props.location.state || {};

    if (filterName) {
      return filterName;
    }

    if (!account) {
      if (id === 'budgeted') {
        return 'Budgeted Accounts';
      } else if (id === 'offbudget') {
        return 'Off Budget Accounts';
      } else if (id === 'uncategorized') {
        return 'Uncategorized';
      } else if (!id) {
        return 'All Accounts';
      }
      return null;
    }

    return (account.closed ? 'Closed: ' : '') + account.name;
  }

  getBalanceQuery(account, id) {
    return {
      name: `balance-query-${id}`,
      query: this.makeRootQuery().calculate({ $sum: '$amount' })
    };
  }

  isNew = id => {
    return this.props.newTransactions.includes(id);
  };

  isMatched = id => {
    return this.props.matchedTransactions.includes(id);
  };

  onCreatePayee = name => {
    let trimmed = name.trim();
    if (trimmed !== '') {
      return this.props.createPayee(name);
    }
    return null;
  };

  onReconcile = balance => {
    this.setState({ reconcileAmount: balance });
  };

  onDoneReconciling = () => {
    this.setState({ reconcileAmount: null });
  };

  onCreateReconciliationTransaction = async diff => {
    // Create a new reconciliation transaction
    const reconciliationTransactions = realizeTempTransactions([
      {
        id: 'temp',
        account: this.props.accountId,
        cleared: true,
        amount: diff,
        date: currentDay(),
        notes: 'Reconciliation balance adjustment'
      }
    ]);

    // Optimistic UI: update the transaction list before sending the data to the database
    this.setState({
      transactions: [...this.state.transactions, ...reconciliationTransactions]
    });

    // sync the reconciliation transaction
    await send('transactions-batch-update', {
      added: reconciliationTransactions
    });
    await this.refetchTransactions();
  };

  onShowTransactions = async ids => {
    this.onApplyFilter({
      customName: 'Selected transactions',
      filter: { id: { $oneof: ids } }
    });
  };

  onBatchEdit = async (name, ids) => {
    let onChange = async (name, value) => {
      this.setState({ workingHard: true });

      let { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' })
      );
      let transactions = ungroupTransactions(data);

      let changes = { deleted: [], updated: [] };

      // Cleared is a special case right now
      if (name === 'cleared') {
        // Clear them if any are uncleared, otherwise unclear them
        value = !!transactions.find(t => !t.cleared);
      }

      const idSet = new Set(ids);

      transactions.forEach(trans => {
        if (!idSet.has(trans.id)) {
          // Skip transactions which aren't actually selected, since the query
          // above also retrieves the siblings & parent of any selected splits.
          return;
        }

        let { diff } = updateTransaction(transactions, {
          ...trans,
          [name]: value
        });

        // TODO: We need to keep an updated list of transactions so
        // the logic in `updateTransaction`, particularly about
        // updating split transactions, works. This isn't ideal and we
        // should figure something else out
        transactions = applyChanges(diff, transactions);

        changes.deleted = changes.deleted
          ? changes.deleted.concat(diff.deleted)
          : diff.deleted;
        changes.updated = changes.updated
          ? changes.updated.concat(diff.updated)
          : diff.updated;
        changes.added = changes.added
          ? changes.added.concat(diff.added)
          : diff.added;
      });

      await send('transactions-batch-update', changes);
      await this.refetchTransactions();

      if (this.table.current) {
        this.table.current.edit(transactions[0].id, 'select', false);
      }
    };

    if (name === 'cleared') {
      // Cleared just toggles it on/off and it depends on the data
      // loaded. Need to clean this up in the future.
      onChange('cleared', null);
    } else {
      this.props.pushModal('edit-field', { name, onSubmit: onChange });
    }
  };

  onBatchDelete = async ids => {
    this.setState({ workingHard: true });

    let { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' })
    );
    let transactions = ungroupTransactions(data);

    let idSet = new Set(ids);
    let changes = { deleted: [], updated: [] };

    transactions.forEach(trans => {
      let parentId = trans.parent_id;

      // First, check if we're actually deleting this transaction by
      // checking `idSet`. Then, we don't need to do anything if it's
      // a child transaction and the parent is already being deleted
      if (!idSet.has(trans.id) || (parentId && idSet.has(parentId))) {
        return;
      }

      let { diff } = deleteTransaction(transactions, trans.id);

      // TODO: We need to keep an updated list of transactions so
      // the logic in `updateTransaction`, particularly about
      // updating split transactions, works. This isn't ideal and we
      // should figure something else out
      transactions = applyChanges(diff, transactions);

      changes.deleted = diff.deleted
        ? changes.deleted.concat(diff.deleted)
        : diff.deleted;
      changes.updated = diff.updated
        ? changes.updated.concat(diff.updated)
        : diff.updated;
    });

    await send('transactions-batch-update', changes);
    await this.refetchTransactions();
  };

  onBatchUnlink = async ids => {
    await send('transactions-batch-update', {
      updated: ids.map(id => ({ id, schedule: null }))
    });

    await this.refetchTransactions();
  };

  onDeleteFilter = filter => {
    this.applyFilters(this.state.filters.filter(f => f !== filter));
  };

  onApplyFilter = async cond => {
    let filters = this.state.filters;
    if (cond.customName) {
      filters = filters.filter(f => f.customName !== cond.customName);
    }
    this.applyFilters([...filters, cond]);
  };

  onScheduleAction = async (name, ids) => {
    switch (name) {
      case 'post-transaction':
        for (let id of ids) {
          let parts = id.split('/');
          await send('schedule/post-transaction', { id: parts[1] });
        }
        this.refetchTransactions();
        break;
      case 'skip':
        for (let id of ids) {
          let parts = id.split('/');
          await send('schedule/skip-next-date', { id: parts[1] });
        }
        break;
      default:
    }
  };

  applyFilters = async conditions => {
    if (conditions.length > 0) {
      let customFilters = conditions
        .filter(cond => !!cond.customName)
        .map(f => f.filter);
      let { filters } = await send('make-filters-from-conditions', {
        conditions: conditions.filter(cond => !cond.customName)
      });

      this.currentQuery = this.rootQuery.filter({
        $and: [...filters, ...customFilters]
      });
      this.updateQuery(this.currentQuery, true);
      this.setState({ filters: conditions, search: '' });
    } else {
      this.setState({ transactions: [], transactionCount: 0 });
      this.fetchTransactions();
      this.setState({ filters: conditions, search: '' });
    }
  };

  render() {
    let {
      accounts,
      categoryGroups,
      payees,
      syncEnabled,
      dateFormat,
      addNotification,
      accountsSyncing,
      replaceModal,
      showExtraBalances,
      accountId
    } = this.props;
    let {
      transactions,
      loading,
      workingHard,
      reconcileAmount,
      transactionsFiltered,
      editingName,
      showBalances,
      balances
    } = this.state;

    let account = accounts.find(account => account.id === accountId);
    const accountName = this.getAccountTitle(account, accountId);

    if (!accountName && !loading) {
      // This is probably an account that was deleted, so redirect to
      // all accounts
      return <Redirect to="/accounts" />;
    }

    let showEmptyMessage = !loading && !accountId && accounts.length === 0;

    let isNameEditable =
      accountId &&
      accountId !== 'budgeted' &&
      accountId !== 'offbudget' &&
      accountId !== 'uncategorized';

    let balanceQuery = this.getBalanceQuery(account, accountId);

    return (
      <AllTransactions
        transactions={transactions}
        filtered={transactionsFiltered}
      >
        {allTransactions =>
          allTransactions == null ? null : (
            <SelectedProviderWithItems
              name="transactions"
              items={allTransactions}
              fetchAllIds={this.fetchAllIds}
              registerDispatch={dispatch => (this.dispatchSelected = dispatch)}
            >
              <View style={[styles.page, { backgroundColor: colors.n11 }]}>
                <AccountHeader
                  tableRef={this.table}
                  editingName={editingName}
                  isNameEditable={isNameEditable}
                  workingHard={workingHard}
                  account={account}
                  accountName={accountName}
                  accountsSyncing={accountsSyncing}
                  accounts={accounts}
                  transactions={transactions}
                  showBalances={showBalances}
                  showExtraBalances={showExtraBalances}
                  showEmptyMessage={showEmptyMessage}
                  balanceQuery={balanceQuery}
                  syncEnabled={syncEnabled}
                  canCalculateBalance={this.canCalculateBalance}
                  reconcileAmount={reconcileAmount}
                  search={this.state.search}
                  filters={this.state.filters}
                  savePrefs={this.props.savePrefs}
                  onSearch={this.onSearch}
                  onShowTransactions={this.onShowTransactions}
                  onMenuSelect={this.onMenuSelect}
                  onAddTransaction={this.onAddTransaction}
                  onToggleExtraBalances={this.onToggleExtraBalances}
                  onSaveName={this.onSaveName}
                  onExposeName={this.onExposeName}
                  onReconcile={this.onReconcile}
                  onDoneReconciling={this.onDoneReconciling}
                  onCreateReconciliationTransaction={
                    this.onCreateReconciliationTransaction
                  }
                  onSync={this.onSync}
                  onImport={this.onImport}
                  onBatchDelete={this.onBatchDelete}
                  onBatchEdit={this.onBatchEdit}
                  onBatchUnlink={this.onBatchUnlink}
                  onDeleteFilter={this.onDeleteFilter}
                  onApplyFilter={this.onApplyFilter}
                  onScheduleAction={this.onScheduleAction}
                />

                <View style={{ flex: 1 }}>
                  <TransactionList
                    tableRef={this.table}
                    account={account}
                    transactions={transactions}
                    allTransactions={allTransactions}
                    animated={this.animated}
                    loadMoreTransactions={() =>
                      this.paged && this.paged.fetchNext()
                    }
                    accounts={accounts}
                    categoryGroups={categoryGroups}
                    payees={payees}
                    balances={
                      showBalances && this.canCalculateBalance()
                        ? balances
                        : null
                    }
                    showAccount={
                      !accountId ||
                      accountId === 'offbudget' ||
                      accountId === 'budgeted' ||
                      accountId === 'uncategorized'
                    }
                    isAdding={this.state.isAdding}
                    isNew={this.isNew}
                    isMatched={this.isMatched}
                    isFiltered={
                      this.state.search !== '' || this.state.filters.length > 0
                    }
                    dateFormat={dateFormat}
                    addNotification={addNotification}
                    renderEmpty={() =>
                      showEmptyMessage ? (
                        <EmptyMessage
                          onAdd={() =>
                            replaceModal(
                              syncEnabled ? 'add-account' : 'add-local-account'
                            )
                          }
                        />
                      ) : !loading ? (
                        <View
                          style={{
                            marginTop: 20,
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}
                        >
                          No transactions
                        </View>
                      ) : null
                    }
                    onChange={this.onTransactionsChange}
                    onRefetch={this.refetchTransactions}
                    onRefetchUpToRow={row =>
                      this.paged.refetchUpToRow(row, {
                        field: 'date',
                        order: 'desc'
                      })
                    }
                    onCloseAddTransaction={() =>
                      this.setState({ isAdding: false })
                    }
                    onCreatePayee={this.onCreatePayee}
                  />
                </View>
              </View>
            </SelectedProviderWithItems>
          )
        }
      </AllTransactions>
    );
  }
}

function AccountHack(props) {
  let { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  return (
    <AccountInternal
      {...props}
      splitsExpandedDispatch={splitsExpandedDispatch}
    />
  );
}

export default function Account(props) {
  let state = useSelector(state => ({
    newTransactions: state.queries.newTransactions,
    matchedTransactions: state.queries.matchedTransactions,
    accounts: state.queries.accounts,
    failedAccounts: state.account.failedAccounts,
    categoryGroups: state.queries.categories.grouped,
    syncEnabled: state.prefs.local['flags.syncAccount'],
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    expandSplits: props.match && state.prefs.local['expand-splits'],
    showBalances:
      props.match &&
      state.prefs.local['show-balances-' + props.match.params.id],
    showExtraBalances:
      props.match &&
      state.prefs.local['show-extra-balances-' + props.match.params.id],
    payees: state.queries.payees,
    modalShowing: state.modals.modalStack.length > 0,
    accountsSyncing: state.account.accountsSyncing,
    lastUndoState: state.app.lastUndoState,
    tutorialStage: state.tutorial.stage
  }));

  let dispatch = useDispatch();
  let actionCreators = useMemo(
    () => bindActionCreators(actions, dispatch),
    [dispatch]
  );

  let params = useParams();
  let location = useLocation();
  let activeLocation = useActiveLocation();

  let transform = useMemo(() => {
    let filter = queries.getAccountFilter(params.id, '_account');

    // Never show schedules on these pages
    if (
      (location.state && location.state.filter) ||
      params.id === 'uncategorized'
    ) {
      filter = { id: null };
    }

    return q => {
      q = q.filter({ $and: [filter, { '_account.closed': false }] });
      return q.orderBy({ next_date: 'desc' });
    };
  }, [params.id]);

  return (
    <SchedulesProvider transform={transform}>
      <SplitsExpandedProvider
        initialMode={state.expandSplits ? 'collapse' : 'expand'}
      >
        <AccountHack
          {...state}
          {...actionCreators}
          modalShowing={
            state.modalShowing ||
            !!(activeLocation.state && activeLocation.state.locationPtr)
          }
          accountId={params.id}
          location={props.location}
        />
      </SplitsExpandedProvider>
    </SchedulesProvider>
  );
}
