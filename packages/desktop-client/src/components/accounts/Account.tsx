import React, {
  type MutableRefObject,
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Trans } from 'react-i18next';
import { Navigate, useParams, useLocation } from 'react-router-dom';

import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import {
  addNotification,
  createPayee,
  initiallyLoadPayees,
  markAccountRead,
  openAccountCloseModal,
  pushModal,
  reopenAccount,
  replaceModal,
  syncAndDownload,
  unlinkAccount,
  updateAccount,
} from 'loot-core/client/actions';
import {
  useTransactions,
  useTransactionsSearch,
} from 'loot-core/client/data-hooks/transactions';
import { validForTransfer } from 'loot-core/client/transfer';
import { type UndoState } from 'loot-core/server/undo';
import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import {
  accountSchedulesQuery,
  SchedulesProvider,
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import { runQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import * as undo from 'loot-core/src/platform/client/undo';
import { currentDay } from 'loot-core/src/shared/months';
import { type Query } from 'loot-core/src/shared/query';
import { getScheduledAmount } from 'loot-core/src/shared/schedules';
import {
  updateTransaction,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
  makeChild,
  makeAsNonChildTransactions,
} from 'loot-core/src/shared/transactions';
import { applyChanges, groupById } from 'loot-core/src/shared/util';
import {
  type NewRuleEntity,
  type RuleActionEntity,
  type AccountEntity,
  type RuleConditionEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/src/types/models';

import { useAccountPreviewTransactions } from '../../hooks/useAccountPreviewTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { usePayees } from '../../hooks/usePayees';
import { usePrevious } from '../../hooks/usePrevious';
import {
  SelectedProvider,
  useSelected,
  useSelectedDispatch,
} from '../../hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '../../hooks/useSplitsExpanded';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useTransactionBatchActions } from '../../hooks/useTransactionBatchActions';
import { useDispatch, useSelector } from '../../redux';
import { styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { type SavedFilter } from '../filters/SavedFilterMenuButton';
import { TransactionList } from '../transactions/TransactionList';
import { validateAccountName } from '../util/accountValidation';

import { AccountHeader } from './Header';

type ConditionEntity = Partial<RuleConditionEntity> | TransactionFilterEntity;

function isTransactionFilterEntity(
  filter: ConditionEntity,
): filter is TransactionFilterEntity {
  return 'id' in filter;
}

type EmptyMessageProps = {
  onAdd: () => void;
};

function EmptyMessage({ onAdd }: EmptyMessageProps) {
  return (
    <View
      style={{
        color: theme.tableText,
        backgroundColor: theme.tableBackground,
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: 550,
          marginTop: 75,
          fontSize: 15,
          alignItems: 'center',
        }}
      >
        <Text style={{ textAlign: 'center', lineHeight: '1.4em' }}>
          <Trans>
            For Actual to be useful, you need to <strong>add an account</strong>
            . You can link an account to automatically download transactions, or
            manage it locally yourself.
          </Trans>
        </Text>

        <Button
          variant="primary"
          style={{ marginTop: 20 }}
          autoFocus
          onPress={onAdd}
        >
          <Trans>Add account</Trans>
        </Button>

        <View
          style={{ marginTop: 20, fontSize: 13, color: theme.tableTextLight }}
        >
          <Trans>In the future, you can add accounts from the sidebar.</Trans>
        </View>
      </View>
    </View>
  );
}

function getField(field?: string) {
  if (!field) {
    return 'date';
  }

  switch (field) {
    case 'account':
      return 'account.name';
    case 'payee':
      return 'payee.name';
    case 'category':
      return 'category.name';
    case 'payment':
      return 'amount';
    case 'deposit':
      return 'amount';
    default:
      return field;
  }
}

function getAccountTitle(
  account?: AccountEntity,
  id?: string,
  filterName?: string,
) {
  if (filterName) {
    return filterName;
  }

  if (!account) {
    if (id === 'onbudget') {
      return t('On Budget Accounts');
    } else if (id === 'offbudget') {
      return t('Off Budget Accounts');
    } else if (id === 'uncategorized') {
      return t('Uncategorized');
    } else if (!id) {
      return t('All Accounts');
    }
    return null;
  }

  return account.name;
}

type TableRefProps = {
  edit: (updatedId: string | null, op?: string, someBool?: boolean) => void;
  setRowAnimation: (animation: boolean) => void;
  scrollTo: (focusId: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => string;
};
export type TableRef = MutableRefObject<TableRefProps | null>;

type SortOptions = {
  ascDesc: 'asc' | 'desc';
  field: string;
  prevField?: string;
  prevAscDesc?: 'asc' | 'desc';
};

type AccountTransactionsProps = {
  accountId?: AccountEntity['id'] | 'onbudget' | 'offbudget' | 'uncategorized';
  categoryId?: string;
};

function AccountTransactions({
  accountId,
  categoryId,
}: AccountTransactionsProps) {
  const { grouped: categoryGroups } = useCategories();
  const payees = usePayees();
  const accounts = useAccounts();
  const location = useLocation();
  const savedFilters = useFilters();
  const dispatch = useDispatch();
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const params = useParams();

  const newTransactions = useSelector(state => state.queries.newTransactions);
  const matchedTransactions = useSelector(
    state => state.queries.matchedTransactions,
  );
  const failedAccounts = useFailedAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [hideFractionPref] = useSyncedPref('hideFraction');
  const [hideFraction] = useState(Boolean(hideFractionPref));
  const [showBalancesPref, setShowBalancesPref] = useSyncedPref(
    `show-balances-${params.id}`,
  );
  const [showBalances, setShowBalances] = useState(Boolean(showBalancesPref));
  const [hideClearedPref, setHideClearedPref] = useSyncedPref(
    `hide-cleared-${params.id}`,
  );
  const [hideCleared, setHideCleared] = useState(Boolean(hideClearedPref));
  const previousHideCleared = usePrevious(hideCleared);
  const [hideReconciledPref, setHideReconciledPref] = useSyncedPref(
    `hide-reconciled-${params.id}`,
  );
  const [hideReconciled, setHideReconciled] = useState(
    Boolean(hideReconciledPref),
  );
  const [showExtraBalancesPref, setShowExtraBalancesPref] = useSyncedPref(
    `show-extra-balances-${params.id || 'all-accounts'}`,
  );
  const [showExtraBalances, setShowExtraBalances] = useState(
    Boolean(showExtraBalancesPref),
  );
  const modalShowing = useSelector(state => state.modals.modalStack.length > 0);
  const accountsSyncing = useSelector(state => state.account.accountsSyncing);

  // const savedFiters = useFilters();
  const tableRef = useRef<TableRefProps>(null);
  const dispatchSelected = useSelectedDispatch();
  const {
    onBatchDelete,
    onBatchDuplicate,
    onBatchEdit,
    onBatchLinkSchedule,
    onBatchUnlinkSchedule,
  } = useTransactionBatchActions();

  const [filterConditions, setFilterConditions] = useState<ConditionEntity[]>(
    location?.state?.filterConditions || [],
  );
  const [filterId, setFilterId] = useState<SavedFilter | null>();
  const [filterConditionsOp, setFilterConditionsOp] = useState<'and' | 'or'>(
    'and',
  );
  const [reconcileAmount, setReconcileAmount] = useState<number | null>(null);
  const [runningBalances, setRunningBalances] = useState<Record<
    string,
    { balance: number }
  > | null>(null);
  const [editingName, setEditingName] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [sort, setSort] = useState<SortOptions>(null);
  // const [filteredAmount, setFilteredAmount] = useState<number | null>(null);
  const [isProcessingTransactions, setIsProcessingTransactions] =
    useState(false);
  const [transactionsQuery, setTransactionsQuery] = useState<Query | undefined>(
    undefined,
  );

  const applySort = useCallback(
    (query: Query, { field, ascDesc, prevField, prevAscDesc }: SortOptions) => {
      const isFiltered = filterConditions.length > 0;
      const sortField = getField(!field ? sort?.field : field);
      const sortAscDesc = !ascDesc ? sort?.ascDesc : ascDesc;
      const sortPrevField = getField(!prevField ? sort?.prevField : prevField);
      const sortPrevAscDesc = !prevField ? sort?.prevAscDesc : prevAscDesc;

      const sortQuery = (
        query: Query,
        sortField: string,
        sortAscDesc?: 'asc' | 'desc',
      ) => {
        if (sortField === 'cleared') {
          query = query.orderBy({
            reconciled: sortAscDesc,
          });
        }

        return query.orderBy({
          [sortField]: sortAscDesc,
        });
      };

      const sortNoActiveFiltersQuery = (
        query: Query,
        sortField: string,
        sortAscDesc?: 'asc' | 'desc',
      ) => {
        if (sortField === 'cleared') {
          return query
            .orderBy({
              reconciled: sortAscDesc,
            })
            .orderBy({
              cleared: sortAscDesc,
            });
        }

        return query.orderBy({
          [sortField]: sortAscDesc,
        });
      };

      // sort by previously used sort field, if any
      const maybeSortByPreviousField = (
        query: Query,
        sortPrevField: string,
        sortPrevAscDesc?: 'asc' | 'desc',
      ) => {
        if (!sortPrevField) {
          return query;
        }

        if (sortPrevField === 'cleared') {
          query = query.orderBy({
            reconciled: sortPrevAscDesc,
          });
        }

        return query.orderBy({
          [sortPrevField]: sortPrevAscDesc,
        });
      };

      switch (true) {
        // called by applyFilters to sort an already filtered result
        case !field:
          query = sortQuery(query, sortField, sortAscDesc);
          break;

        // called directly from UI by sorting a column.
        // active filters need to be applied before sorting
        case isFiltered:
          // TODO: Verify that this is no longer needed.
          // this.applyFilters([...filterConditions]);
          query = sortQuery(query, sortField, sortAscDesc);
          break;

        // called directly from UI by sorting a column.
        // no active filters, start a new root query.
        case !isFiltered:
          query = sortNoActiveFiltersQuery(query, sortField, sortAscDesc);
          break;

        default:
          break;
      }

      return maybeSortByPreviousField(query, sortPrevField, sortPrevAscDesc);
    },
    [
      filterConditions.length,
      sort?.ascDesc,
      sort?.field,
      sort?.prevAscDesc,
      sort?.prevField,
    ],
  );

  const applyFilters = useCallback(
    async (query: Query, conditions: ConditionEntity[]) => {
      if (conditions.length > 0) {
        const filteredCustomQueryFilters: Partial<RuleConditionEntity>[] =
          conditions.filter(cond => !isTransactionFilterEntity(cond));
        const customQueryFilters = filteredCustomQueryFilters.map(
          f => f.queryFilter,
        );
        const { filters: queryFilters } = await send(
          'make-filters-from-conditions',
          {
            conditions: conditions.filter(
              cond => isTransactionFilterEntity(cond) || !cond.customName,
            ),
          },
        );
        const conditionsOpKey = filterConditionsOp === 'or' ? '$or' : '$and';
        return query.filter({
          [conditionsOpKey]: [...queryFilters, ...customQueryFilters],
        });
      }

      return query;
    },
    [filterConditionsOp],
  );

  const baseTransactionsQuery = useCallback(
    (options: { accountId: string; hideReconciled: boolean }) => {
      let query = queries
        .transactions(options.accountId)
        .options({ splits: 'grouped' });
      if (options.hideReconciled) {
        query = query.filter({ reconciled: { $eq: false } });
      }
      return query.select('*');
    },
    [],
  );

  const filteredTransactionsQuery = useCallback(
    async (query: Query, filterConditions: ConditionEntity[]) => {
      return await applyFilters(query, filterConditions);
    },
    [applyFilters],
  );

  const sortedTransactionsQuery = useCallback(
    async (query: Query, sort: SortOptions) => {
      return sort ? applySort(query, sort) : query;
    },
    [applySort],
  );

  const rootTransactionsQuery = useCallback(
    async () =>
      sortedTransactionsQuery(
        await filteredTransactionsQuery(
          baseTransactionsQuery({
            accountId,
            hideReconciled,
          }),
          filterConditions,
        ),
        sort,
      ),
    [
      sortedTransactionsQuery,
      filteredTransactionsQuery,
      baseTransactionsQuery,
      accountId,
      hideReconciled,
      filterConditions,
      sort,
    ],
  );

  // Doesn't depend on current transactions, but total unfiltered account balance.
  const accountBalanceQuery = useMemo(
    () =>
      baseTransactionsQuery({
        accountId,
        hideReconciled: false,
      }).calculate({ $sum: '$amount' }),
    [accountId, baseTransactionsQuery],
  );

  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    useAccountPreviewTransactions({
      accountId,
    });
  const previewTransactionsWithInverse: (TransactionEntity & {
    _inverse?: boolean;
  })[] = useMemo(
    () =>
      previewTransactions.map(trans => ({
        ...trans,
        _inverse: accountId ? accountId !== trans.account : false,
      })),
    [accountId, previewTransactions],
  );

  useEffect(() => {
    if (!isPreviewTransactionsLoading) {
      splitsExpandedDispatch({
        type: 'close-splits',
        ids: previewTransactions.map(t => t.id),
      });
    }
  }, [
    isPreviewTransactionsLoading,
    previewTransactions,
    splitsExpandedDispatch,
  ]);

  const calculateRunningBalances = useCallback(async () => {
    const { data: balances } = await runQuery(
      queries
        .transactions(accountId)
        .options({ splits: 'none' })
        .orderBy({ date: 'desc' })
        .select([{ balance: { $sumOver: '$amount' } }]),
    );

    const latestBalance = balances[0]?.balance ?? 0;

    const previewBalancesById = previewTransactionsWithInverse.reduce(
      (map, trans, index, array) => {
        map[trans.id] = {
          balance: array
            .slice(index, array.length)
            .reduce(
              (sum, t) => sum + getScheduledAmount(t.amount),
              latestBalance,
            ),
        };
        return map;
      },
      {},
    );
    const balancesById = groupById<{ id: string; balance: number }>(balances);

    return {
      ...previewBalancesById,
      ...balancesById,
    };
  }, [accountId, previewTransactionsWithInverse]);

  useEffect(() => {
    let isUnmounted = false;

    async function initRunningBalances() {
      const balances = await calculateRunningBalances();
      if (!isUnmounted) {
        setRunningBalances(balances);
      }
    }

    initRunningBalances();

    return () => {
      isUnmounted = true;
    };
  }, [calculateRunningBalances]);

  const {
    isLoading: isTransactionsLoading,
    transactions: transactionsGrouped,
    reload: reloadTransactions,
    loadMore: loadMoreTransactions,
  } = useTransactions({
    query: transactionsQuery,
    options: { pageCount: 150 },
  });

  const transactions = useMemo(
    () => ungroupTransactions(transactionsGrouped),
    [transactionsGrouped],
  );

  useEffect(() => {
    let isUnmounted = false;

    async function initQuery() {
      const rootQuery = await rootTransactionsQuery();
      if (!isUnmounted) {
        setTransactionsQuery(rootQuery);
      }
    }

    initQuery();

    return () => {
      isUnmounted = true;
    };
  }, [rootTransactionsQuery]);

  useEffect(() => {
    dispatch(initiallyLoadPayees());

    if (accountId) {
      dispatch(markAccountRead(accountId));
    }
  }, [accountId, dispatch]);

  useEffect(() => {
    const onUndo = async ({ tables, messages }: UndoState) => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        reloadTransactions?.();
      }

      // If all the messages are dealing with transactions, find the
      // first message referencing a non-deleted row so that we can
      // highlight the row
      //
      let focusId: null | string = null;
      if (
        messages.every(msg => msg.dataset === 'transactions') &&
        !messages.find(msg => msg.column === 'tombstone')
      ) {
        const focusableMsgs = messages.filter(
          msg =>
            msg.dataset === 'transactions' && !(msg.column === 'tombstone'),
        );

        focusId = focusableMsgs.length === 1 ? focusableMsgs[0].row : null;

        // Highlight the transactions
        // this.table && this.table.highlight(focusableMsgs.map(msg => msg.row));
      }

      if (tableRef.current) {
        tableRef.current.edit(null);

        // Focus a transaction if applicable. There is a chance if the
        // user navigated away that focusId is a transaction that has
        // been "paged off" and we won't focus it. That's ok, we just
        // do our best.
        if (focusId) {
          tableRef.current.scrollTo(focusId);
        }
      }

      undo.setUndoState('undoEvent', null);
    };

    // If there is a pending undo, apply it immediately (this happens
    // when an undo changes the location to this page)
    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      onUndo(lastUndoEvent);
    }

    return listen('undo-event', onUndo);
  }, [dispatch, reloadTransactions]);

  useEffect(() => {
    let isUnmounted = false;
    const unlisten = listen('sync-event', ({ type, tables }) => {
      if (isUnmounted) {
        return;
      }

      if (type === 'applied') {
        if (
          tables.includes('transactions') ||
          tables.includes('category_mapping') ||
          tables.includes('payee_mapping')
        ) {
          reloadTransactions?.();
        }

        if (tables.includes('transactions')) {
          // Recalculate running balances when transactions are updated
          calculateRunningBalances().then(setRunningBalances);
        }
      }
    });
    return () => {
      isUnmounted = true;
      unlisten();
    };
  }, [calculateRunningBalances, dispatch, reloadTransactions]);

  const wasModalShowing = usePrevious(modalShowing);
  useEffect(() => {
    // If the user was on a different screen and is now coming back to
    // the transactions, automatically refresh the transaction to make
    // sure we have updated state
    if (wasModalShowing && !modalShowing) {
      reloadTransactions?.();
    }
  }, [modalShowing, reloadTransactions, wasModalShowing]);

  const { isSearching, search: onSearch } = useTransactionsSearch({
    updateQuery: setTransactionsQuery,
    resetQuery: () => rootTransactionsQuery().then(setTransactionsQuery),
    dateFormat,
  });

  const onSync = useCallback(async () => {
    const account = accounts.find(acct => acct.id === accountId);

    await dispatch(syncAndDownload(account ? account.id : undefined));
  }, [accountId, accounts, dispatch]);

  const onImport = useCallback(async () => {
    const account = accounts.find(acct => acct.id === accountId);
    if (account) {
      const res = await window.Actual?.openFileDialog({
        filters: [
          {
            name: t('Financial Files'),
            extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml'],
          },
        ],
      });

      if (res) {
        dispatch(
          pushModal('import-transactions', {
            accountId,
            filename: res[0],
            onImported: (didChange: boolean) => {
              if (didChange) {
                reloadTransactions?.();
              }
            },
          }),
        );
      }
    }
  }, [accountId, accounts, dispatch, reloadTransactions]);

  const onExport = useCallback(
    async (accountName: string) => {
      const exportedTransactions = await send('transactions-export-query', {
        query: transactionsQuery.serialize(),
      });
      const normalizedName =
        accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
      const filename = `${normalizedName || 'transactions'}.csv`;

      window.Actual?.saveFile(
        exportedTransactions,
        filename,
        t('Export Transactions'),
      );
    },
    [transactionsQuery],
  );

  // TODO: Can this be replaced with a state?
  // const onTransactionsChange = (updatedTransaction: TransactionEntity) => {
  //   // Apply changes to pagedQuery data
  //   this.paged?.optimisticUpdate(data => {
  //     if (updatedTransaction._deleted) {
  //       return data.filter(t => t.id !== updatedTransaction.id);
  //     } else {
  //       return data.map(t => {
  //         return t.id === updatedTransaction.id ? updatedTransaction : t;
  //       });
  //     }
  //   });

  //   this.props.updateNewTransactions(updatedTransaction.id);
  //   };

  const onAddTransaction = useCallback(() => {
    setIsAdding(true);
  }, []);

  const onExposeName = useCallback((flag: boolean) => {
    setEditingName(flag);
  }, []);

  const onSaveName = useCallback(
    (name: string) => {
      const accountNameError = validateAccountName(name, accountId, accounts);
      if (accountNameError) {
        setNameError(accountNameError);
      } else {
        const account = accounts.find(account => account.id === accountId);
        // TODO: Double check if updateAccount is actually the same.
        dispatch(updateAccount({ ...account, name }));
        setEditingName(false);
        setNameError('');
      }
    },
    [accountId, accounts, dispatch],
  );

  const onToggleExtraBalances = useCallback(() => {
    setShowExtraBalances(show => {
      show = !show;
      setShowExtraBalancesPref(String(show));
      return show;
    });
  }, [setShowExtraBalancesPref]);

  const onMenuSelect = useCallback(
    async (
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
    ) => {
      const account = accounts.find(account => account.id === accountId)!;

      switch (item) {
        case 'link':
          dispatch(
            pushModal('add-account', {
              upgradingAccountId: accountId,
            }),
          );
          break;
        case 'unlink':
          dispatch(
            pushModal('confirm-unlink-account', {
              accountName: account.name,
              onUnlink: () => {
                dispatch(unlinkAccount(accountId));
              },
            }),
          );
          break;
        case 'close':
          dispatch(openAccountCloseModal(accountId));
          break;
        case 'reopen':
          dispatch(reopenAccount(accountId));
          break;
        case 'export':
          const accountName = getAccountTitle(
            account,
            accountId,
            location.state?.filterName,
          );
          onExport(accountName);
          break;
        case 'toggle-balance':
          setShowBalances(show => {
            show = !show;
            setShowBalancesPref(String(show));
            return show;
          });
          break;
        case 'remove-sorting': {
          setSort(null);
          break;
        }
        case 'toggle-cleared':
          setHideCleared(hide => {
            hide = !hide;
            setHideClearedPref(String(hide));
            return hide;
          });
          break;
        case 'toggle-reconciled':
          setHideReconciled(hide => {
            hide = !hide;
            setHideReconciledPref(String(hide));
            return hide;
          });
          break;
        default:
      }
    },
    [
      accountId,
      accounts,
      dispatch,
      location.state?.filterName,
      onExport,
      setHideClearedPref,
      setHideReconciledPref,
      setShowBalancesPref,
    ],
  );

  const isNew = useCallback(
    (id: string) => {
      return newTransactions.includes(id);
    },
    [newTransactions],
  );

  const isMatched = useCallback(
    (id: string) => {
      return matchedTransactions.includes(id);
    },
    [matchedTransactions],
  );

  const onCreatePayee = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (trimmed !== '') {
        return dispatch(createPayee(name));
      }
      return null;
    },
    [dispatch],
  );

  const lockTransactions = useCallback(async () => {
    setIsProcessingTransactions(true);

    // const { data } = await runQuery(
    //   q('transactions')
    //     .filter({ cleared: true, reconciled: false, account: accountId })
    //     .select('*')
    //     .options({ splits: 'grouped' }),
    // );
    // let transactions = ungroupTransactions(data);

    let transactionToLock = transactions.filter(
      t => t.cleared && !t.reconciled && t.account === accountId,
    );

    const changes: { updated: Array<Partial<TransactionEntity>> } = {
      updated: [],
    };

    transactionToLock.forEach(trans => {
      const { diff } = updateTransaction(transactionToLock, {
        ...trans,
        reconciled: true,
      });

      transactionToLock = applyChanges(diff, transactionToLock);

      changes.updated = changes.updated
        ? changes.updated.concat(diff.updated)
        : diff.updated;
    });

    await send('transactions-batch-update', changes);
    reloadTransactions?.();
    setIsProcessingTransactions(false);
  }, [accountId, reloadTransactions, transactions]);

  const onReconcile = useCallback(
    async (balance: number) => {
      setReconcileAmount(balance);
      setHideCleared(false);
    },
    [setHideCleared],
  );

  const onDoneReconciling = useCallback(async () => {
    // const { data } = await runQuery(
    //   q('transactions')
    //     .filter({ cleared: true, account: accountId })
    //     .select('*')
    //     .options({ splits: 'grouped' }),
    // );
    // const transactions = ungroupTransactions(data);

    const clearedTransactions = transactions.filter(
      t => t.cleared && t.account === accountId,
    );

    let cleared = 0;

    clearedTransactions.forEach(trans => {
      if (!trans.is_parent) {
        cleared += trans.amount;
      }
    });

    const targetDiff = (reconcileAmount || 0) - cleared;

    if (targetDiff === 0) {
      await lockTransactions();
    }

    setReconcileAmount(null);
    // Get back to previous state
    setHideCleared(previousHideCleared);
  }, [
    accountId,
    lockTransactions,
    previousHideCleared,
    reconcileAmount,
    transactions,
  ]);

  const onCreateReconciliationTransaction = useCallback(
    async (diff: number) => {
      // Create a new reconciliation transaction
      const reconciliationTransactions = realizeTempTransactions([
        {
          id: 'temp',
          account: accountId,
          cleared: true,
          reconciled: false,
          amount: diff,
          date: currentDay(),
          notes: t('Reconciliation balance adjustment'),
        },
      ]);

      // run rules on the reconciliation transaction
      const ruledTransactions = await Promise.all(
        reconciliationTransactions.map(transaction =>
          send('rules-run', { transaction }),
        ),
      );

      // sync the reconciliation transaction
      await send('transactions-batch-update', {
        added: ruledTransactions,
      });
      reloadTransactions?.();
    },
    [accountId, reloadTransactions],
  );

  const onBatchEditAndReload = useCallback(
    (name: keyof TransactionEntity, ids: string[]) => {
      onBatchEdit({
        name,
        ids,
        onSuccess: updatedIds => {
          reloadTransactions?.();

          if (tableRef.current) {
            tableRef.current.edit(updatedIds[0], 'select', false);
          }
        },
      });
    },
    [onBatchEdit, reloadTransactions],
  );

  const onBatchDuplicateAndReload = useCallback(
    (ids: string[]) => {
      onBatchDuplicate({ ids, onSuccess: reloadTransactions });
    },
    [onBatchDuplicate, reloadTransactions],
  );

  const onBatchDeleteAndReload = useCallback(
    (ids: string[]) => {
      onBatchDelete({ ids, onSuccess: reloadTransactions });
    },
    [onBatchDelete, reloadTransactions],
  );

  const onMakeAsSplitTransaction = useCallback(
    async (ids: string[]) => {
      setIsProcessingTransactions(true);

      // const { data } = await runQuery(
      //   q('transactions')
      //     .filter({ id: { $oneof: ids } })
      //     .select('*')
      //     .options({ splits: 'none' }),
      // );

      // const transactions: TransactionEntity[] = data;

      const noneSplitTransactions = transactions.filter(
        t => !t.is_parent && !t.parent_id && ids.includes(t.id),
      );
      if (!noneSplitTransactions || noneSplitTransactions.length === 0) {
        return;
      }

      const [firstTransaction] = noneSplitTransactions;
      const parentTransaction = {
        id: uuidv4(),
        is_parent: true,
        cleared: noneSplitTransactions.every(t => !!t.cleared),
        date: firstTransaction.date,
        account: firstTransaction.account,
        amount: noneSplitTransactions
          .map(t => t.amount)
          .reduce((total, amount) => total + amount, 0),
      };
      const childTransactions = noneSplitTransactions.map(t =>
        makeChild(parentTransaction, t),
      );

      await send('transactions-batch-update', {
        added: [parentTransaction],
        updated: childTransactions,
      });

      reloadTransactions?.();
      setIsProcessingTransactions(false);
    },
    [reloadTransactions, transactions],
  );

  const onMakeAsNonSplitTransactions = useCallback(
    async (ids: string[]) => {
      setIsProcessingTransactions(true);

      // const { data } = await runQuery(
      //   q('transactions')
      //     .filter({ id: { $oneof: ids } })
      //     .select('*')
      //     .options({ splits: 'grouped' }),
      // );

      // const groupedTransactions: TransactionEntity[] = data;

      let changes: {
        updated: TransactionEntity[];
        deleted: TransactionEntity[];
      } = {
        updated: [],
        deleted: [],
      };

      const groupedTransactionsToUpdate = transactionsGrouped.filter(
        t => t.is_parent,
      );

      for (const groupedTransaction of groupedTransactionsToUpdate) {
        const transactions = ungroupTransaction(groupedTransaction);
        const [parentTransaction, ...childTransactions] = transactions;

        if (ids.includes(parentTransaction.id)) {
          // Unsplit all child transactions.
          const diff = makeAsNonChildTransactions(
            childTransactions,
            transactions,
          );

          changes = {
            updated: [...changes.updated, ...diff.updated],
            deleted: [...changes.deleted, ...diff.deleted],
          };

          // Already processed the child transactions above, no need to process them below.
          continue;
        }

        // Unsplit selected child transactions.

        const selectedChildTransactions = childTransactions.filter(t =>
          ids.includes(t.id),
        );

        if (selectedChildTransactions.length === 0) {
          continue;
        }

        const diff = makeAsNonChildTransactions(
          selectedChildTransactions,
          transactions,
        );

        changes = {
          updated: [...changes.updated, ...diff.updated],
          deleted: [...changes.deleted, ...diff.deleted],
        };
      }

      await send('transactions-batch-update', changes);

      reloadTransactions?.();

      const transactionsToSelect = changes.updated.map(t => t.id);
      dispatchSelected?.({
        type: 'select-all',
        ids: transactionsToSelect,
      });

      setIsProcessingTransactions(false);
    },
    [dispatchSelected, reloadTransactions, transactionsGrouped],
  );

  const checkForReconciledTransactions = useCallback(
    async (
      ids: string[],
      confirmReason: string,
      onConfirm: (ids: string[]) => void,
    ) => {
      // const { data } = await runQuery(
      //   q('transactions')
      //     .filter({ id: { $oneof: ids }, reconciled: true })
      //     .select('*')
      //     .options({ splits: 'grouped' }),
      // );
      // const transactions = ungroupTransactions(data);

      const reconciledTransactions = transactions.filter(
        t => t.reconciled && ids.includes(t.id),
      );
      if (reconciledTransactions.length > 0) {
        dispatch(
          pushModal('confirm-transaction-edit', {
            onConfirm: () => {
              onConfirm(ids);
            },
            confirmReason,
          }),
        );
      } else {
        onConfirm(ids);
      }
    },
    [dispatch, transactions],
  );

  const onBatchLinkScheduleAndReload = useCallback(
    (ids: string[]) => {
      onBatchLinkSchedule({
        ids,
        account: accounts.find(a => a.id === accountId),
        onSuccess: reloadTransactions,
      });
    },
    [accountId, accounts, onBatchLinkSchedule, reloadTransactions],
  );

  const onBatchUnlinkScheduleAndReload = useCallback(
    (ids: string[]) => {
      onBatchUnlinkSchedule({
        ids,
        onSuccess: reloadTransactions,
      });
    },
    [onBatchUnlinkSchedule, reloadTransactions],
  );

  const onCreateRule = useCallback(
    async (ids: string[]) => {
      // const { data } = await runQuery(
      //   q('transactions')
      //     .filter({ id: { $oneof: ids } })
      //     .select('*')
      //     .options({ splits: 'grouped' }),
      // );

      // const transactions = ungroupTransactions(data);

      const selectedTransactions = transactions.filter(t => ids.includes(t.id));
      const [ruleTransaction, ...otherTransactions] = selectedTransactions;
      const childTransactions = otherTransactions.filter(
        t => t.parent_id === ruleTransaction.id,
      );

      const payeeCondition = ruleTransaction.imported_payee
        ? ({
            field: 'imported_payee',
            op: 'is',
            value: ruleTransaction.imported_payee,
            type: 'string',
          } satisfies RuleConditionEntity)
        : ({
            field: 'payee',
            op: 'is',
            value: ruleTransaction.payee!,
            type: 'id',
          } satisfies RuleConditionEntity);
      const amountCondition = {
        field: 'amount',
        op: 'isapprox',
        value: ruleTransaction.amount,
        type: 'number',
      } satisfies RuleConditionEntity;

      const rule = {
        stage: null,
        conditionsOp: 'and',
        conditions: [payeeCondition, amountCondition],
        actions: [
          ...(childTransactions.length === 0
            ? [
                {
                  op: 'set',
                  field: 'category',
                  value: ruleTransaction.category,
                  type: 'id',
                  options: {
                    splitIndex: 0,
                  },
                } satisfies RuleActionEntity,
              ]
            : []),
          ...childTransactions.flatMap((sub, index) => [
            {
              op: 'set-split-amount',
              value: sub.amount,
              options: {
                splitIndex: index + 1,
                method: 'fixed-amount',
              },
            } satisfies RuleActionEntity,
            {
              op: 'set',
              field: 'category',
              value: sub.category,
              type: 'id',
              options: {
                splitIndex: index + 1,
              },
            } satisfies RuleActionEntity,
          ]),
        ],
      } satisfies NewRuleEntity;

      dispatch(pushModal('edit-rule', { rule }));
    },
    [dispatch, transactions],
  );

  const onSetTransfer = useCallback(
    async (ids: string[]) => {
      const onConfirmTransfer = async (ids: string[]) => {
        setIsProcessingTransactions(true);

        // const { data: transactions } = await runQuery(
        //   q('transactions')
        //     .filter({ id: { $oneof: ids } })
        //     .select('*'),
        // );
        // const [fromTrans, toTrans] = transactions;

        const selectedTransactions = transactions.filter(t =>
          ids.includes(t.id),
        );
        const [fromTrans, toTrans] = selectedTransactions;

        if (
          selectedTransactions.length === 2 &&
          validForTransfer(fromTrans, toTrans)
        ) {
          const fromPayee = payees.find(
            p => p.transfer_acct === fromTrans.account,
          );
          const toPayee = payees.find(p => p.transfer_acct === toTrans.account);

          const changes = {
            updated: [
              {
                ...fromTrans,
                payee: toPayee?.id,
                transfer_id: toTrans.id,
              },
              {
                ...toTrans,
                payee: fromPayee?.id,
                transfer_id: fromTrans.id,
              },
            ],
          };

          await send('transactions-batch-update', changes);
        }

        reloadTransactions?.();
        setIsProcessingTransactions(false);
      };

      await checkForReconciledTransactions(
        ids,
        'batchEditWithReconciled',
        onConfirmTransfer,
      );
    },
    [checkForReconciledTransactions, payees, reloadTransactions, transactions],
  );

  const onConditionsOpChange = useCallback((value: 'and' | 'or') => {
    setFilterConditionsOp(value);
    setFilterId(f => ({ ...f, status: 'changed' }));
  }, []);

  const onReloadSavedFilter = useCallback(
    (savedFilter: SavedFilter, item: string) => {
      if (item === 'reload') {
        const [savedFilter] = savedFilters.filter(f => f.id === filterId?.id);
        setFilterConditionsOp(savedFilter.conditionsOp ?? 'and');
        setFilterConditions([...savedFilter.conditions]);
      } else {
        if (savedFilter.status) {
          setFilterConditionsOp(savedFilter.conditionsOp ?? 'and');
          setFilterConditions([...savedFilter.conditions]);
        }
      }
      setFilterId(f => ({ ...f, ...savedFilter }));
    },
    [filterId?.id, savedFilters],
  );

  const onClearFilters = useCallback(() => {
    setFilterConditionsOp('and');
    setFilterId(undefined);
    setFilterConditions([]);
  }, []);

  const onUpdateFilter = useCallback(
    (
      oldCondition: RuleConditionEntity,
      updatedCondition: RuleConditionEntity,
    ) => {
      // TODO: verify if setting the conditions correctly apply the filters to the query.
      setFilterConditions(f =>
        f.map(c => (c === oldCondition ? updatedCondition : c)),
      );
      setFilterId(f => ({ ...f, status: f && 'changed' }));
    },
    [],
  );

  const onDeleteFilter = useCallback(
    (condition: RuleConditionEntity) => {
      setFilterConditions(f => f.filter(c => c !== condition));

      if (filterConditions.length === 1) {
        setFilterId(undefined);
        setFilterConditionsOp('and');
      } else {
        setFilterId(f => ({ ...f, status: f && 'changed' }));
      }
    },
    [filterConditions.length],
  );

  const onApplyFilter = useCallback(
    async (conditionOrSavedFilter: ConditionEntity) => {
      let _filterConditions = filterConditions;

      if (
        'customName' in conditionOrSavedFilter &&
        conditionOrSavedFilter.customName
      ) {
        _filterConditions = filterConditions.filter(
          c =>
            !isTransactionFilterEntity(c) &&
            c.customName !== conditionOrSavedFilter.customName,
        );
      }

      if (isTransactionFilterEntity(conditionOrSavedFilter)) {
        // A saved filter was passed in.
        const savedFilter = conditionOrSavedFilter;
        setFilterId({ ...savedFilter, status: 'saved' });
        setFilterConditionsOp(savedFilter.conditionsOp);
        setFilterConditions([...savedFilter.conditions]);
      } else {
        // A condition was passed in.
        const condition = conditionOrSavedFilter;
        setFilterId(f => ({ ...f, status: f && 'changed' }));
        setFilterConditions(f => [...f, condition]);
      }
    },
    [filterConditions],
  );

  const onShowTransactions = useCallback(
    async (ids: string[]) => {
      onApplyFilter({
        customName: t('Selected transactions'),
        queryFilter: { id: { $oneof: ids } },
      });
    },
    [onApplyFilter],
  );

  const onScheduleAction = useCallback(
    async (name: 'skip' | 'post-transaction', ids: string[]) => {
      switch (name) {
        case 'post-transaction':
          for (const id of ids) {
            const parts = id.split('/');
            await send('schedule/post-transaction', { id: parts[1] });
          }
          reloadTransactions?.();
          break;
        case 'skip':
          for (const id of ids) {
            const parts = id.split('/');
            await send('schedule/skip-next-date', { id: parts[1] });
          }
          break;
        default:
          throw new Error(`Unknown action: ${name}`);
      }
    },
    [reloadTransactions],
  );

  const onSort = useCallback(
    (headerClicked: string, ascDesc: 'asc' | 'desc') => {
      //if staying on same column but switching asc/desc
      //then keep prev the same
      if (headerClicked === sort?.field) {
        setSort(s => ({ ...s, ascDesc }));
      } else {
        setSort(s => ({
          ...s,
          field: headerClicked,
          ascDesc,
          prevField: s?.field,
          prevAscDesc: s?.ascDesc,
        }));
      }
    },
    [sort?.field],
  );

  const account = accounts.find(account => account.id === accountId);
  const accountName = getAccountTitle(
    account,
    accountId,
    location.state?.filterName,
  );

  const category = categoryGroups
    .flatMap(g => g.categories)
    .find(category => category?.id === categoryId);

  const showEmptyMessage =
    !isTransactionsLoading && !accountId && accounts.length === 0;

  const isNameEditable =
    accountId &&
    accountId !== 'onbudget' &&
    accountId !== 'offbudget' &&
    accountId !== 'uncategorized';

  const isFiltered = filterConditions.length > 0 || isSearching;

  const transactionsWithPreview = useMemo(
    () =>
      !isFiltered && !isPreviewTransactionsLoading
        ? previewTransactionsWithInverse.concat(transactions)
        : transactions,
    [
      isFiltered,
      isPreviewTransactionsLoading,
      previewTransactionsWithInverse,
      transactions,
    ],
  );

  const filteredBalance = useMemo(() => {
    return transactions.reduce((total, t) => total + t.amount, 0);
  }, [transactions]);

  const selectedInst = useSelected(
    'transactions',
    transactionsWithPreview,
    [],
    item => !item._unmatched && !item.is_parent,
  );

  if (!accountName && !isTransactionsLoading) {
    // This is probably an account that was deleted, so redirect to all accounts
    return <Navigate to="/accounts" replace />;
  }

  return (
    <SelectedProvider
      instance={selectedInst}
      fetchAllIds={async () => transactions.map(t => t.id)}
    >
      <View style={styles.page}>
        <AccountHeader
          tableRef={tableRef}
          editingName={editingName}
          isNameEditable={isNameEditable}
          // TODO: Check if workingHard is still needed.
          isLoading={isTransactionsLoading || isProcessingTransactions}
          accountId={accountId}
          account={account}
          filterId={filterId}
          savedFilters={savedFilters}
          accountName={accountName}
          accountsSyncing={accountsSyncing}
          failedAccounts={failedAccounts}
          accounts={accounts}
          transactions={transactions}
          showBalances={showBalances}
          showExtraBalances={showExtraBalances}
          showCleared={!hideCleared}
          showReconciled={!hideReconciled}
          showEmptyMessage={showEmptyMessage}
          transactionsQuery={transactionsQuery}
          balanceQuery={accountBalanceQuery}
          filteredBalance={filteredBalance}
          showFilteredBalance={isFiltered}
          isSorted={sort !== null}
          reconcileAmount={reconcileAmount}
          // @ts-expect-error fix me
          filterConditions={filterConditions}
          filterConditionsOp={filterConditionsOp}
          onSearch={onSearch}
          onShowTransactions={onShowTransactions}
          onMenuSelect={onMenuSelect}
          onAddTransaction={onAddTransaction}
          onToggleExtraBalances={onToggleExtraBalances}
          onSaveName={onSaveName}
          saveNameError={nameError}
          onExposeName={onExposeName}
          onReconcile={onReconcile}
          onDoneReconciling={onDoneReconciling}
          onCreateReconciliationTransaction={onCreateReconciliationTransaction}
          onSync={onSync}
          onImport={onImport}
          onBatchDelete={onBatchDeleteAndReload}
          onBatchDuplicate={onBatchDuplicateAndReload}
          onBatchEdit={onBatchEditAndReload}
          onBatchLinkSchedule={onBatchLinkScheduleAndReload}
          onBatchUnlinkSchedule={onBatchUnlinkScheduleAndReload}
          onCreateRule={onCreateRule}
          onUpdateFilter={onUpdateFilter}
          onClearFilters={onClearFilters}
          onReloadSavedFilter={onReloadSavedFilter}
          onConditionsOpChange={onConditionsOpChange}
          onDeleteFilter={onDeleteFilter}
          onApplyFilter={onApplyFilter}
          onScheduleAction={onScheduleAction}
          onSetTransfer={onSetTransfer}
          onMakeAsSplitTransaction={onMakeAsSplitTransaction}
          onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
        />

        <View style={{ flex: 1 }}>
          <TransactionList
            isLoading={isTransactionsLoading}
            tableRef={tableRef}
            account={account}
            transactions={transactions}
            allTransactions={transactionsWithPreview}
            loadMoreTransactions={loadMoreTransactions}
            accounts={accounts}
            category={category}
            categoryGroups={categoryGroups}
            payees={payees}
            balances={runningBalances}
            showBalances={showBalances && runningBalances}
            showReconciled={!hideReconciled}
            showCleared={!hideCleared}
            showAccount={
              !accountId ||
              accountId === 'offbudget' ||
              accountId === 'onbudget' ||
              accountId === 'uncategorized'
            }
            isAdding={isAdding}
            isNew={isNew}
            isMatched={isMatched}
            isFiltered={filterConditions.length > 0}
            dateFormat={dateFormat}
            hideFraction={hideFraction}
            renderEmpty={() =>
              showEmptyMessage ? (
                <EmptyMessage
                  onAdd={() => dispatch(replaceModal('add-account'))}
                />
              ) : !isTransactionsLoading ? (
                <View
                  style={{
                    color: theme.tableText,
                    marginTop: 20,
                    textAlign: 'center',
                    fontStyle: 'italic',
                  }}
                >
                  No transactions
                </View>
              ) : null
            }
            addNotification={notification =>
              dispatch(addNotification(notification))
            }
            onSort={onSort}
            sortField={sort?.field}
            ascDesc={sort?.ascDesc}
            // onChange={onTransactionsChange}
            onChange={() => {}}
            onBatchDelete={onBatchDeleteAndReload}
            onBatchDuplicate={onBatchDuplicateAndReload}
            onBatchLinkSchedule={onBatchLinkScheduleAndReload}
            onBatchUnlinkSchedule={onBatchUnlinkScheduleAndReload}
            onCreateRule={onCreateRule}
            onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
            onScheduleAction={onScheduleAction}
            onRefetch={reloadTransactions}
            onCloseAddTransaction={() => setIsAdding(false)}
            onCreatePayee={onCreatePayee}
            onApplyFilter={onApplyFilter}
          />
        </View>
      </View>
    </SelectedProvider>
  );
}

export function Account() {
  const params = useParams();
  const location = useLocation();
  const [expandSplits = true] = useLocalPref('expand-splits');

  const schedulesQuery = useMemo(
    () => accountSchedulesQuery(params.id),
    [params.id],
  );

  return (
    <SchedulesProvider query={schedulesQuery}>
      <SplitsExpandedProvider
        initialMode={expandSplits ? 'collapse' : 'expand'}
      >
        <AccountTransactions
          accountId={params.id}
          categoryId={location?.state?.categoryId}
        />
      </SplitsExpandedProvider>
    </SchedulesProvider>
  );
}
