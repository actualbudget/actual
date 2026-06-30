import React, {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, RefObject } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans } from 'react-i18next';
import { Navigate, useLocation, useParams } from 'react-router';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { listen, send } from '@actual-app/core/platform/client/connection';
import * as undo from '@actual-app/core/platform/client/undo';
import type { UndoState } from '@actual-app/core/server/undo';
import { currentDay } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import type { Query } from '@actual-app/core/shared/query';
import {
  makeAsNonChildTransactions,
  makeChild,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
  updateTransaction,
} from '@actual-app/core/shared/transactions';
import { applyChanges } from '@actual-app/core/shared/util';
import type { IntegerAmount } from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryGroupEntity,
  NewRuleEntity,
  PayeeEntity,
  RuleActionEntity,
  RuleConditionEntity,
  TransactionEntity,
  TransactionFilterEntity,
} from '@actual-app/core/types/models';
import { debounce, isEqual } from 'es-toolkit/compat';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import {
  useReopenAccountMutation,
  useSyncAndDownloadMutation,
  useUnlinkAccountMutation,
  useUpdateAccountMutation,
} from '#accounts';
import { markAccountRead } from '#accounts/accountsSlice';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import type { SavedFilter } from '#components/filters/SavedFilterMenuButton';
import { TransactionList } from '#components/transactions/TransactionList';
import { validateAccountName } from '#components/util/accountValidation';
import { useAccountPreviewTransactions } from '#hooks/useAccountPreviewTransactions';
import { useAccounts } from '#hooks/useAccounts';
import { SchedulesProvider } from '#hooks/useCachedSchedules';
import { useCategories } from '#hooks/useCategories';
import { useDateFormat } from '#hooks/useDateFormat';
import { useLocalPref } from '#hooks/useLocalPref';
import { usePayees } from '#hooks/usePayees';
import { getSchedulesQuery } from '#hooks/useSchedules';
import { SelectedProviderWithItems } from '#hooks/useSelected';
import type { Actions } from '#hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '#hooks/useSplitsExpanded';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useTransactionBatchActions } from '#hooks/useTransactionBatchActions';
import { useTransactionFilters } from '#hooks/useTransactionFilters';
import { calculateRunningBalancesBottomUp } from '#hooks/useTransactions';
import {
  openAccountCloseModal,
  pushModal,
  replaceModal,
} from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useCreatePayeeMutation } from '#payees';
import * as queries from '#queries';
import { aqlQuery } from '#queries/aqlQuery';
import { pagedQuery } from '#queries/pagedQuery';
import type { PagedQuery } from '#queries/pagedQuery';
import { useDispatch, useSelector } from '#redux';
import { updateNewTransactions } from '#transactions/transactionsSlice';

import { AccountEmptyMessage } from './AccountEmptyMessage';
import { AccountHeader } from './Header';

type ConditionEntity = Partial<RuleConditionEntity> | TransactionFilterEntity;

function isTransactionFilterEntity(
  filter: ConditionEntity,
): filter is TransactionFilterEntity {
  return 'id' in filter;
}

type AllTransactionsProps = {
  account?: AccountEntity | undefined;
  transactions: TransactionEntity[];
  balances: Record<TransactionEntity['id'], IntegerAmount> | null;
  showBalances?: boolean | undefined;
  filtered?: boolean | undefined;
  children: (
    transactions: TransactionEntity[],
    balances: Record<TransactionEntity['id'], IntegerAmount> | null,
  ) => ReactElement;
};

function AllTransactions({
  account,
  transactions,
  balances,
  showBalances,
  filtered,
  children,
}: AllTransactionsProps) {
  const accountId = account?.id;
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const { previewTransactions, isLoading: isPreviewTransactionsLoading } =
    useAccountPreviewTransactions({ accountId });

  useEffect(() => {
    if (!isPreviewTransactionsLoading) {
      splitsExpandedDispatch({
        type: 'close-splits',
        ids: previewTransactions.filter(t => t.is_parent).map(t => t.id),
      });
    }
  }, [
    isPreviewTransactionsLoading,
    previewTransactions,
    splitsExpandedDispatch,
  ]);

  transactions ??= [];

  const runningBalance = useMemo(() => {
    if (!showBalances) {
      return 0;
    }

    return balances && transactions?.length > 0
      ? (balances[transactions[0].id] ?? 0)
      : 0;
  }, [showBalances, balances, transactions]);

  const prependBalances = useMemo(() => {
    if (!showBalances) {
      return null;
    }

    return Object.fromEntries(
      calculateRunningBalancesBottomUp(
        previewTransactions,
        'all',
        runningBalance,
      ),
    );
  }, [showBalances, previewTransactions, runningBalance]);

  const allTransactions = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && previewTransactions.length > 0) {
      return previewTransactions.concat(transactions);
    }
    return transactions;
  }, [filtered, previewTransactions, transactions]);

  const allBalances = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependBalances && balances) {
      return { ...prependBalances, ...balances };
    }
    return balances;
  }, [filtered, prependBalances, balances]);

  if (!previewTransactions?.length || filtered) {
    return children(transactions, balances);
  }
  return children(allTransactions, allBalances);
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

type AccountInternalProps = {
  accountId?:
    | AccountEntity['id']
    | 'onbudget'
    | 'offbudget'
    | 'uncategorized'
    | undefined;
  filterConditions: RuleConditionEntity[];
  showBalances?: boolean;
  setShowBalances: (newValue: boolean) => void;
  showNetWorthChart: boolean;
  setShowNetWorthChart: (newValue: boolean) => void;
  showCleared?: boolean;
  setShowCleared: (newValue: boolean) => void;
  showReconciled: boolean;
  setShowReconciled: (newValue: boolean) => void;
  showExtraBalances?: boolean;
  setShowExtraBalances: (newValue: boolean) => void;
  modalShowing?: boolean;
  accounts: AccountEntity[];
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  expandSplits?: boolean | undefined;
  savedFilters: TransactionFilterEntity[];
  categoryId?: string;
  location: ReturnType<typeof useLocation>;
  dateFormat: ReturnType<typeof useDateFormat>;
  payees: PayeeEntity[];
  categoryGroups: CategoryGroupEntity[];
  hideFraction: boolean;
  accountsSyncing: string[];
  onReopenAccount: (id: AccountEntity['id']) => void;
  onUpdateAccount: (account: AccountEntity) => void;
  onUnlinkAccount: (id: AccountEntity['id']) => void;
  onSyncAndDownload: (accountId?: AccountEntity['id']) => void;
  onCreatePayee: (name: PayeeEntity['name']) => Promise<PayeeEntity['id']>;
};

export type TableRef = RefObject<{
  edit: (updatedId: string | null, op?: string, someBool?: boolean) => void;
  setRowAnimation: (animation: boolean) => void;
  scrollTo: (focusId: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => string;
} | null>;

function AccountInternal(props: AccountInternalProps) {
  // === HOOKS (merged from AccountHack) ===
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const dispatch = useDispatch();
  const {
    onBatchEdit: onBatchEditAction,
    onBatchDuplicate: onBatchDuplicateAction,
    onBatchLinkSchedule: onBatchLinkScheduleAction,
    onBatchUnlinkSchedule: onBatchUnlinkScheduleAction,
    onBatchDelete: onBatchDeleteAction,
    onSetTransfer: onSetTransferAction,
  } = useTransactionBatchActions();

  // === STATE ===
  const [search, setSearch] = useState('');
  const [filterConditions, setFilterConditions] = useState<ConditionEntity[]>(
    props.filterConditions || [],
  );
  const [filterId, setFilterId] = useState<SavedFilter | undefined>();
  const [filterConditionsOp, setFilterConditionsOp] = useState<'and' | 'or'>(
    'and',
  );
  const [loading, setLoading] = useState(true);
  const [workingHard, setWorkingHard] = useState(false);
  const [reconcileAmount, setReconcileAmount] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [transactionsFiltered, setTransactionsFiltered] = useState<
    boolean | undefined
  >();
  const [balances, setBalances] = useState<Record<
    TransactionEntity['id'],
    IntegerAmount
  > | null>(null);
  const [showBalances, setShowBalances] = useState(props.showBalances ?? false);
  const [showCleared, setShowCleared] = useState(props.showCleared);
  const [showReconciled, setShowReconciled] = useState(props.showReconciled);
  const [nameError, setNameError] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [filteredAmount, setFilteredAmount] = useState<number | null>(null);
  const [sort, setSort] = useState<{
    ascDesc: 'asc' | 'desc';
    field: string;
    prevField?: string;
    prevAscDesc?: 'asc' | 'desc';
  } | null>(null);

  // === REFS ===
  const pagedRef = useRef<PagedQuery<TransactionEntity> | null>(null);
  const rootQueryRef = useRef<Query>(null!);
  const currentQueryRef = useRef<Query>(null!);
  const tableRef = useRef<{
    edit: (updatedId: string | null, op?: string, someBool?: boolean) => void;
    setRowAnimation: (animation: boolean) => void;
    scrollTo: (focusId: string) => void;
    scrollToTop: () => void;
    getScrolledItem: () => string;
  }>(null);
  const dispatchSelectedRef = useRef<((action: Actions) => void) | undefined>(
    undefined,
  );
  const isOptimisticUpdateRef = useRef(false);
  const prevShowClearedRef = useRef<boolean | undefined>(undefined);
  const prevAccountIdRef = useRef(props.accountId);
  const prevModalShowingRef = useRef(props.modalShowing);

  // State snapshot ref for async callbacks (onData, debounced functions, etc.)
  const stateRef = useRef({
    search,
    filterConditions,
    filterConditionsOp,
    sort,
    showBalances: props.showBalances ?? false,
    showReconciled,
    showCleared,
    balances,
    filteredAmount,
    transactions,
    loading,
    transactionsFiltered,
  });
  stateRef.current = {
    search,
    filterConditions,
    filterConditionsOp,
    sort,
    showBalances: props.showBalances ?? false,
    showReconciled,
    showCleared,
    balances,
    filteredAmount,
    transactions,
    loading,
    transactionsFiltered,
  };

  // === METHODS ===

  const fetchAllIds = async () => {
    if (!pagedRef.current) {
      return [];
    }

    const { data } = await aqlQuery(pagedRef.current.query.select('id'));
    return data.reduce((arr: string[], t: TransactionEntity) => {
      arr.push(t.id);
      t.subtransactions?.forEach(sub => arr.push(sub.id));
      return arr;
    }, []);
  };

  const refetchTransactions = async () => {
    void pagedRef.current?.run();
  };

  const makeRootTransactionsQuery = () => {
    return queries.transactions(props.accountId);
  };

  const updateQuery = (query: Query, isFiltered: boolean = false) => {
    if (pagedRef.current) {
      pagedRef.current.unsubscribe();
    }

    if (
      !showReconciled &&
      (!showBalances ||
        isFiltered ||
        search !== '' ||
        (sort !== null && (sort.field !== 'date' || sort.ascDesc !== 'desc')))
    ) {
      query = query.filter({ reconciled: { $eq: false } });
    }

    pagedRef.current = pagedQuery(query.select('*'), {
      onData: async (groupedData, prevData) => {
        const data = ungroupTransactions([...groupedData]);
        const firstLoad = prevData == null;

        if (isOptimisticUpdateRef.current) {
          isOptimisticUpdateRef.current = false;
          startTransition(() => {
            setTransactions(data);
          });
          return;
        }

        if (firstLoad) {
          tableRef.current?.setRowAnimation(false);

          if (isFiltered) {
            splitsExpandedDispatch({
              type: 'set-mode',
              mode: 'collapse',
            });
          } else {
            splitsExpandedDispatch({
              type: 'set-mode',
              mode: props.expandSplits ? 'expand' : 'collapse',
            });
          }
        }

        const s = stateRef.current;
        const balances = s.showBalances ? await calculateBalances() : null;
        const filteredAmount = await getFilteredAmount();
        setTransactions(data);
        setTransactionsFiltered(isFiltered);
        setLoading(false);
        setWorkingHard(false);
        setBalances(balances);
        setFilteredAmount(filteredAmount);

        if (firstLoad) {
          tableRef.current?.scrollToTop();
        }

        setTimeout(() => {
          tableRef.current?.setRowAnimation(true);
        }, 0);
      },
      options: {
        pageCount: 150,
        onlySync: true,
      },
    });
  };

  const fetchTransactions = (filterConditionsParam?: ConditionEntity[]) => {
    const query = makeRootTransactionsQuery();
    rootQueryRef.current = currentQueryRef.current = query;
    if (filterConditionsParam) void applyFilters(filterConditionsParam);
    else updateQuery(query);

    if (props.accountId) {
      dispatch(markAccountRead({ id: props.accountId }));
    }
  };

  const onSearch = (value: string) => {
    pagedRef.current?.unsubscribe();
    setSearch(value);
    onSearchDoneRef.current?.();
  };

  const onSearchDoneRef = useRef(
    debounce(() => {
      const s = stateRef.current.search;
      if (s === '') {
        updateQuery(
          currentQueryRef.current,
          stateRef.current.filterConditions.length > 0,
        );
      } else {
        updateQuery(
          queries.transactionsSearch(
            currentQueryRef.current,
            s,
            props.dateFormat,
          ),
          true,
        );
      }
    }, 150),
  );

  const onSync = async () => {
    const accountId = props.accountId;
    const account = props.accounts.find(acct => acct.id === accountId);
    props.onSyncAndDownload(account ? account.id : accountId);
  };

  const onImport = async () => {
    const accountId = props.accountId;
    const account = props.accounts.find(acct => acct.id === accountId);

    if (account) {
      const res = await window.Actual.openFileDialog({
        filters: [
          {
            name: t('Financial files'),
            extensions: ['qif', 'ofx', 'qfx', 'csv', 'tsv', 'xml'],
          },
        ],
      });

      if (res) {
        if (accountId && res?.length > 0) {
          dispatch(
            pushModal({
              modal: {
                name: 'import-transactions',
                options: {
                  accountId,
                  filename: res[0],
                  onImported: (didChange: boolean) => {
                    if (didChange) {
                      fetchTransactions();
                    }
                  },
                },
              },
            }),
          );
        }
      }
    }
  };

  const onExport = async (accountName: string) => {
    const exportedTransactions = await send('transactions-export-query', {
      query: currentQueryRef.current.serialize(),
    });
    const normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    const filename = `${normalizedName || 'transactions'}.csv`;

    void window.Actual.saveFile(
      exportedTransactions,
      filename,
      t('Export transactions'),
    );
  };

  const onTransactionsChange = (updatedTransaction: TransactionEntity) => {
    isOptimisticUpdateRef.current = true;
    pagedRef.current?.optimisticUpdate(data => {
      if (updatedTransaction._deleted) {
        return data.filter(t => t.id !== updatedTransaction.id);
      } else {
        return data.map(t => {
          return t.id === updatedTransaction.id ? updatedTransaction : t;
        });
      }
    });

    dispatch(updateNewTransactions({ id: updatedTransaction.id }));
  };

  const canCalculateBalance = () => {
    const accountId = props.accountId;
    const account = props.accounts.find(account => account.id === accountId);
    if (!account) return false;
    if (search !== '') return false;
    if (filterConditions.length > 0) return false;
    if (sort === null) {
      return true;
    } else {
      return sort.field === 'date' && sort.ascDesc === 'desc';
    }
  };

  const calculateBalances = async () => {
    if (!canCalculateBalance() || !pagedRef.current) {
      return null;
    }

    const { data }: { data: { id: string; balance: number }[] } =
      await aqlQuery(
        pagedRef.current.query
          .options({ splits: 'none' })
          .select([{ balance: { $sumOver: '$amount' } }]),
      );

    return data.reduce((balances: Record<string, number>, row) => {
      balances[row.id] = row.balance;
      return balances;
    }, {});
  };

  const onRunRules = async (ids: string[]) => {
    try {
      setWorkingHard(true);
      const selectedTransactions = transactions.filter(trans =>
        ids.includes(trans.id),
      );
      const changedTransactions: TransactionEntity[] = [];
      const allErrors: string[] = [];

      for (const transaction of selectedTransactions) {
        const res: TransactionEntity | null = await send('rules-run', {
          transaction,
        });
        if (res) {
          changedTransactions.push(...ungroupTransaction(res));

          if (res._ruleErrors && res._ruleErrors.length > 0) {
            allErrors.push(...res._ruleErrors);
          }
        }
      }

      if (allErrors.length > 0) {
        dispatch(
          addNotification({
            notification: {
              type: 'error',
              message: `Formula errors in rules:\n${allErrors.join('\n')}`,
              sticky: true,
            },
          }),
        );
      }

      if (changedTransactions.length > 0) {
        await send('transactions-batch-update', {
          updated: changedTransactions,
        });
      }

      fetchTransactions();
    } catch (error) {
      console.error('Error applying rules:', error);
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: 'Failed to apply rules to transactions',
          },
        }),
      );
    } finally {
      setWorkingHard(false);
    }
  };

  const onAddTransaction = () => {
    setIsAdding(true);
  };

  const onSaveName = (name: string) => {
    const accountNameError = validateAccountName(
      name,
      props.accountId ?? '',
      props.accounts,
    );
    if (accountNameError) {
      setNameError(accountNameError);
    } else {
      const account = props.accounts.find(
        account => account.id === props.accountId,
      );
      if (!account) {
        throw new Error(`Account with ID ${props.accountId} not found.`);
      }
      props.onUpdateAccount({ ...account, name });
      setNameError('');
    }
  };

  const onToggleExtraBalances = () => {
    props.setShowExtraBalances(!props.showExtraBalances);
  };

  const onMenuSelect = async (
    item:
      | 'link'
      | 'unlink'
      | 'close'
      | 'reopen'
      | 'export'
      | 'toggle-balance'
      | 'remove-sorting'
      | 'toggle-cleared'
      | 'toggle-reconciled'
      | 'toggle-net-worth-chart',
  ) => {
    const accountId = props.accountId!;
    const account = props.accounts.find(account => account.id === accountId)!;

    switch (item) {
      case 'link':
        dispatch(
          pushModal({
            modal: {
              name: 'add-account',
              options: {
                upgradingAccountId: accountId,
              },
            },
          }),
        );
        break;
      case 'unlink':
        dispatch(
          pushModal({
            modal: {
              name: 'confirm-unlink-account',
              options: {
                accountName: account.name,
                isViewBankSyncSettings: false,
                onUnlink: () => {
                  props.onUnlinkAccount(accountId);
                },
              },
            },
          }),
        );
        break;
      case 'close':
        void dispatch(openAccountCloseModal({ accountId }));
        break;
      case 'reopen':
        props.onReopenAccount(accountId);
        break;
      case 'export':
        const accountName = getAccountTitle(account, accountId);
        void onExport(accountName);
        break;
      case 'toggle-balance':
        if (showBalances) {
          props.setShowBalances(false);
          setShowBalances(false);
          setBalances(null);
        } else {
          props.setShowBalances(true);
          setTransactions([]);
          setFilterConditions([]);
          setSearch('');
          setSort(null);
          setShowBalances(true);
          fetchTransactions();
        }
        break;
      case 'remove-sorting': {
        setSort(null);
        if (filterConditions.length > 0) {
          void applyFilters([...filterConditions]);
        } else {
          fetchTransactions();
        }
        if (search !== '') {
          onSearch(search);
        }
        break;
      }
      case 'toggle-cleared':
        if (showCleared) {
          props.setShowCleared(false);
          setShowCleared(false);
        } else {
          props.setShowCleared(true);
          setShowCleared(true);
        }
        break;
      case 'toggle-reconciled':
        if (showReconciled) {
          props.setShowReconciled(false);
          setShowReconciled(false);
          fetchTransactions(filterConditions);
        } else {
          props.setShowReconciled(true);
          setShowReconciled(true);
          fetchTransactions(filterConditions);
        }
        break;
      case 'toggle-net-worth-chart':
        if (props.showNetWorthChart) {
          props.setShowNetWorthChart(false);
        } else {
          props.setShowNetWorthChart(true);
        }
        break;
      default:
    }
  };

  const getAccountTitle = (account?: AccountEntity, id?: string) => {
    const { filterName } = props.location.state || {};

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
  };

  const getBalanceQuery = (id?: string) => {
    return {
      name: `balance-query-${id}`,
      query: makeRootTransactionsQuery().calculate({ $sum: '$amount' }),
    } as const;
  };

  const getFilteredAmount = async () => {
    if (!pagedRef.current) {
      return 0;
    }

    const { data: amount } = await aqlQuery(
      pagedRef.current.query.calculate({ $sum: '$amount' }),
    );
    return amount;
  };

  const isNew = (id: TransactionEntity['id']) => {
    return props.newTransactions.includes(id);
  };

  const isMatched = (id: TransactionEntity['id']) => {
    return props.matchedTransactions.includes(id);
  };

  const onCreatePayee = async (name: string) => {
    const trimmed = name.trim();
    if (trimmed !== '') {
      return await props.onCreatePayee(name);
    }
    return null;
  };

  const lockTransactions = async () => {
    setWorkingHard(true);

    const { accountId } = props;

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ cleared: true, reconciled: false, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    let lockedData = ungroupTransactions(data);

    const changes: { updated: Array<Partial<TransactionEntity>> } = {
      updated: [],
    };

    lockedData.forEach(trans => {
      const { diff } = updateTransaction(lockedData, {
        ...trans,
        reconciled: true,
      });

      lockedData = applyChanges(diff, lockedData);

      changes.updated = changes.updated
        ? changes.updated.concat(diff.updated)
        : diff.updated;
    });

    await send('transactions-batch-update', changes);
    await refetchTransactions();
  };

  const onReconcile = async (amount: number | null) => {
    prevShowClearedRef.current = showCleared;
    setReconcileAmount(amount);
    setShowCleared(true);
  };

  const onDoneReconciling = async () => {
    const { accountId } = props;
    const account = props.accounts.find(account => account.id === accountId);
    if (!account) {
      throw new Error(`Account with ID ${accountId} not found.`);
    }

    const rAmount = reconcileAmount;

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ cleared: true, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const reconciledTransactions = ungroupTransactions(data);

    let cleared = 0;

    reconciledTransactions.forEach(trans => {
      if (!trans.is_parent) {
        cleared += trans.amount;
      }
    });

    const targetDiff = (rAmount || 0) - cleared;

    if (targetDiff === 0) {
      await lockTransactions();
    }

    const lastReconciled = new Date().getTime().toString();
    props.onUpdateAccount({ ...account, last_reconciled: lastReconciled });

    setReconcileAmount(null);
    setShowCleared(prevShowClearedRef.current);
  };

  const onCreateReconciliationTransaction = async (diff: number) => {
    const reconciliationTransactions = realizeTempTransactions([
      {
        id: 'temp',
        account: props.accountId!,
        cleared: true,
        reconciled: false,
        amount: diff,
        date: currentDay(),
        notes: t('Reconciliation balance adjustment'),
      },
    ]);

    setTransactions(prev => [...reconciliationTransactions, ...prev]);

    const ruledTransactions = await Promise.all(
      reconciliationTransactions.map(transaction =>
        send('rules-run', { transaction }),
      ),
    );

    await send('transactions-batch-update', {
      added: ruledTransactions.filter(trans => !trans.tombstone),
      deleted: ruledTransactions.filter(trans => trans.tombstone),
    });
    await refetchTransactions();
  };

  const onShowTransactions = async (ids: string[]) => {
    void onApplyFilter({
      customName: t('Selected transactions'),
      queryFilter: { id: { $oneof: ids } },
    });
  };

  const onBatchEdit = (name: keyof TransactionEntity, ids: string[]) => {
    void onBatchEditAction({
      name,
      ids,
      onSuccess: updatedIds => {
        void refetchTransactions();

        if (tableRef.current) {
          tableRef.current.edit(updatedIds[0], 'select', false);
        }
      },
    });
  };

  const onBatchDuplicate = (ids: string[]) => {
    void onBatchDuplicateAction({
      ids,
      onSuccess: refetchTransactions,
    });
  };

  const onBatchDelete = (ids: string[]) => {
    void onBatchDeleteAction({ ids, onSuccess: refetchTransactions });
  };

  const onMakeAsSplitTransaction = async (ids: string[]) => {
    setWorkingHard(true);

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'none' }),
    );

    const splitTransactions: TransactionEntity[] = data;

    if (!splitTransactions || splitTransactions.length === 0) {
      return;
    }

    const [firstTransaction] = splitTransactions;
    const parentTransaction = {
      id: uuidv4(),
      is_parent: true,
      cleared: splitTransactions.every(t => !!t.cleared),
      date: firstTransaction.date,
      account: firstTransaction.account,
      amount: splitTransactions
        .map(t => t.amount)
        .reduce((total, amount) => total + amount, 0),
    };
    const childTransactions = splitTransactions.map(t =>
      makeChild(parentTransaction, t),
    );

    await send('transactions-batch-update', {
      added: [parentTransaction],
      updated: childTransactions,
    });

    void refetchTransactions();
  };

  const onMakeAsNonSplitTransactions = async (ids: string[]) => {
    setWorkingHard(true);

    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const groupedTransactions: TransactionEntity[] = data;

    let changes: {
      updated: TransactionEntity[];
      deleted: TransactionEntity[];
    } = {
      updated: [],
      deleted: [],
    };

    const groupedTransactionsToUpdate = groupedTransactions.filter(
      t => t.is_parent,
    );

    for (const groupedTransaction of groupedTransactionsToUpdate) {
      const transactionsData = ungroupTransaction(groupedTransaction);
      const [parentTransaction, ...childTransactions] = transactionsData;

      if (ids.includes(parentTransaction.id)) {
        const diff = makeAsNonChildTransactions(
          childTransactions,
          transactionsData,
        );

        changes = {
          updated: [...changes.updated, ...diff.updated],
          deleted: [...changes.deleted, ...diff.deleted],
        };

        continue;
      }

      const selectedChildTransactions = childTransactions.filter(t =>
        ids.includes(t.id),
      );

      if (selectedChildTransactions.length === 0) {
        continue;
      }

      const diff = makeAsNonChildTransactions(
        selectedChildTransactions,
        transactionsData,
      );

      changes = {
        updated: [...changes.updated, ...diff.updated],
        deleted: [...changes.deleted, ...diff.deleted],
      };
    }

    await send('transactions-batch-update', changes);

    void refetchTransactions();

    const transactionsToSelect = changes.updated.map(t => t.id);
    dispatchSelectedRef.current?.({
      type: 'select-all',
      ids: transactionsToSelect,
    });
  };

  const onMergeTransactions = async (ids: string[]) => {
    const keptId = await send(
      'transactions-merge',
      ids.map(id => ({ id })),
    );
    await refetchTransactions();
    dispatchSelectedRef.current?.({
      type: 'select-all',
      ids: [keptId],
    });
  };

  const onBatchLinkSchedule = (ids: string[]) => {
    void onBatchLinkScheduleAction({
      ids,
      account: props.accounts.find(a => a.id === props.accountId),
      onSuccess: refetchTransactions,
    });
  };

  const onBatchUnlinkSchedule = (ids: string[]) => {
    void onBatchUnlinkScheduleAction({
      ids,
      onSuccess: refetchTransactions,
    });
  };

  const onCreateRule = async (ids: string[]) => {
    const { data } = await aqlQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const ruleTransactions = ungroupTransactions(data);
    const ruleTransaction = ruleTransactions[0];
    const childTransactions = ruleTransactions.filter(
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

    dispatch(pushModal({ modal: { name: 'edit-rule', options: { rule } } }));
  };

  const onSetTransfer = async (ids: string[]) => {
    setWorkingHard(true);
    await onSetTransferAction(ids, props.payees, refetchTransactions);
  };

  const onConditionsOpChange = (value: 'and' | 'or') => {
    setFilterConditionsOp(value);
    setFilterId(prev => ({ ...prev, status: 'changed' }) as SavedFilter);
    void applyFilters([...filterConditions]);
    if (search !== '') {
      onSearch(search);
    }
  };

  const onReloadSavedFilter = (savedFilter: SavedFilter, item?: string) => {
    if (item === 'reload') {
      const filter = props.savedFilters.find(f => f.id === filterId?.id);
      if (filter) {
        setFilterConditionsOp(filter.conditionsOp ?? 'and');
        void applyFilters([...filter.conditions]);
      }
    } else {
      if (savedFilter.status) {
        setFilterConditionsOp(savedFilter.conditionsOp ?? 'and');
        void applyFilters([...(savedFilter.conditions ?? [])]);
      }
    }
    setFilterId(prev => ({ ...prev, ...savedFilter }));
  };

  const onClearFilters = () => {
    setFilterConditionsOp('and');
    setFilterId(undefined);
    void applyFilters([]);
    if (search !== '') {
      onSearch(search);
    }
  };

  const onUpdateFilter = (
    oldCondition: RuleConditionEntity,
    updatedCondition: RuleConditionEntity,
  ) => {
    void applyFilters(
      filterConditions.map(c => (c === oldCondition ? updatedCondition : c)),
    );
    setFilterId(
      prev =>
        ({
          ...prev,
          status: prev && 'changed',
        }) as SavedFilter,
    );
    if (search !== '') {
      onSearch(search);
    }
  };

  const onDeleteFilter = (condition: RuleConditionEntity) => {
    void applyFilters(filterConditions.filter(c => c !== condition));
    if (filterConditions.length === 1) {
      setFilterId(undefined);
      setFilterConditionsOp('and');
    } else {
      setFilterId(
        prev =>
          ({
            ...prev,
            status: prev && 'changed',
          }) as SavedFilter,
      );
    }
    if (search !== '') {
      onSearch(search);
    }
  };

  const onApplyFilter = async (conditionOrSavedFilter: ConditionEntity) => {
    let currentFilterConditions = filterConditions;

    if (
      'customName' in conditionOrSavedFilter &&
      conditionOrSavedFilter.customName
    ) {
      currentFilterConditions = currentFilterConditions.filter(
        c =>
          !isTransactionFilterEntity(c) &&
          c.customName !== conditionOrSavedFilter.customName,
      );
    }

    if (isTransactionFilterEntity(conditionOrSavedFilter)) {
      const savedFilter = conditionOrSavedFilter;
      setFilterId({ ...savedFilter, status: 'saved' });
      setFilterConditionsOp(savedFilter.conditionsOp);
      void applyFilters([...savedFilter.conditions]);
    } else {
      const condition = conditionOrSavedFilter;
      const isDuplicate = currentFilterConditions.some(c =>
        isEqual(c, condition),
      );

      if (isDuplicate) {
        return;
      }

      setFilterId(
        prev =>
          ({
            ...prev,
            status: prev && 'changed',
          }) as SavedFilter,
      );
      void applyFilters([...currentFilterConditions, condition]);
    }

    if (search !== '') {
      onSearch(search);
    }
  };

  const onScheduleAction = async (
    name: 'skip' | 'post-transaction' | 'post-transaction-today' | 'complete',
    ids: TransactionEntity['id'][],
  ) => {
    const scheduleIds = ids.map(id => id.split('/')[1]);

    switch (name) {
      case 'post-transaction':
        for (const id of scheduleIds) {
          await send('schedule/post-transaction', { id });
        }
        void refetchTransactions();
        break;
      case 'post-transaction-today':
        for (const id of scheduleIds) {
          await send('schedule/post-transaction', { id, today: true });
        }
        void refetchTransactions();
        break;
      case 'skip':
        for (const id of scheduleIds) {
          await send('schedule/skip-next-date', { id });
        }
        break;
      case 'complete':
        for (const id of scheduleIds) {
          await send('schedule/update', { schedule: { id, completed: true } });
        }
        break;
      default:
    }
  };

  const applyFilters = async (conditions: ConditionEntity[]) => {
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
      currentQueryRef.current = rootQueryRef.current.filter({
        [conditionsOpKey]: [...queryFilters, ...customQueryFilters],
      });

      setFilterConditions(conditions);
      updateQuery(currentQueryRef.current, true);
    } else {
      setTransactions([]);
      setFilterConditions(conditions);
      fetchTransactions();
    }

    if (sort !== null) {
      applySort();
    }
  };

  const applySort = (
    field?: string,
    ascDesc?: 'asc' | 'desc',
    prevField?: string,
    prevAscDesc?: 'asc' | 'desc',
  ) => {
    const currentFilterConditions = filterConditions;
    const isFiltered = currentFilterConditions.length > 0;
    const sortField = getField(!field ? sort?.field : field);
    const sortAscDesc = !ascDesc ? sort?.ascDesc : ascDesc;
    const sortPrevField = getField(!prevField ? sort?.prevField : prevField);
    const sortPrevAscDesc = !prevField ? sort?.prevAscDesc : prevAscDesc;

    const sortCurrentQuery = function (
      currentSortField: string,
      currentSortAscDesc?: 'asc' | 'desc',
    ) {
      if (currentSortField === 'cleared') {
        currentQueryRef.current = currentQueryRef.current.orderBy({
          reconciled: currentSortAscDesc,
        });
      }

      currentQueryRef.current = currentQueryRef.current.orderBy({
        [currentSortField]: currentSortAscDesc,
      });
    };

    const sortRootQuery = function (
      currentSortField: string,
      currentSortAscDesc?: 'asc' | 'desc',
    ) {
      if (currentSortField === 'cleared') {
        currentQueryRef.current = rootQueryRef.current.orderBy({
          reconciled: currentSortAscDesc,
        });
        currentQueryRef.current = currentQueryRef.current.orderBy({
          cleared: currentSortAscDesc,
        });
      } else {
        currentQueryRef.current = rootQueryRef.current.orderBy({
          [currentSortField]: currentSortAscDesc,
        });
      }
    };

    const maybeSortByPreviousField = function (
      currentSortPrevField: string,
      currentSortPrevAscDesc?: 'asc' | 'desc',
    ) {
      if (!currentSortPrevField) {
        return;
      }

      if (currentSortPrevField === 'cleared') {
        currentQueryRef.current = currentQueryRef.current.orderBy({
          reconciled: currentSortPrevAscDesc,
        });
      }

      currentQueryRef.current = currentQueryRef.current.orderBy({
        [currentSortPrevField]: currentSortPrevAscDesc,
      });
    };

    switch (true) {
      case !field:
        sortCurrentQuery(sortField, sortAscDesc);
        break;
      case isFiltered:
        void applyFilters([...currentFilterConditions]);
        sortCurrentQuery(sortField, sortAscDesc);
        break;
      case !isFiltered:
        sortRootQuery(sortField, sortAscDesc);
        break;
      default:
    }

    maybeSortByPreviousField(sortPrevField, sortPrevAscDesc);

    currentQueryRef.current = currentQueryRef.current.orderBy({
      sort_order: sortAscDesc,
    });

    updateQuery(currentQueryRef.current, isFiltered);
  };

  const onSort = (headerClicked: string, ascDesc: 'asc' | 'desc') => {
    let prevField: string | undefined;
    let prevAscDesc: 'asc' | 'desc' | undefined;

    if (headerClicked === sort?.field) {
      prevField = sort.prevField;
      prevAscDesc = sort.prevAscDesc;
      setSort(
        prev =>
          ({
            ...prev,
            field: headerClicked,
            ascDesc,
          }) as typeof sort,
      );
    } else {
      prevField = sort?.field;
      prevAscDesc = sort?.ascDesc;
      setSort({
        field: headerClicked,
        ascDesc,
        prevField: sort?.field,
        prevAscDesc: sort?.ascDesc,
      });
    }

    applySort(headerClicked, ascDesc, prevField, prevAscDesc);
    if (search !== '') {
      onSearch(search);
    }
  };

  // === EFFECTS ===

  useEffect(() => {
    const maybeRefetch = (tables: string[]) => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        return refetchTransactions();
      }
    };

    const onUndo = async ({ tables, messages }: UndoState) => {
      await maybeRefetch(tables);

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
      }

      if (tableRef.current) {
        tableRef.current.edit(null);

        if (focusId) {
          tableRef.current.scrollTo(focusId);
        }
      }

      undo.setUndoState('undoEvent', null);
    };

    const unlistens = [listen('undo-event', onUndo)];

    fetchTransactions(filterConditions);

    const lastUndoEvent = undo.getUndoState('undoEvent');
    if (lastUndoEvent) {
      void onUndo(lastUndoEvent);
    }

    return () => {
      unlistens.forEach(unlisten => unlisten());
      if (pagedRef.current) {
        pagedRef.current.unsubscribe();
      }
    };
    // eslint-disable-next-line react-compiler/react-hooks, react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isAdding && prevAccountIdRef.current !== props.accountId) {
      setIsAdding(false);
    }

    if (prevModalShowingRef.current && !props.modalShowing) {
      setTimeout(() => {
        void refetchTransactions();
      }, 100);
    }

    if (prevAccountIdRef.current !== props.accountId) {
      setSort(null);
      setSearch('');
      setFilterConditions([]);
    }

    prevAccountIdRef.current = props.accountId;
    prevModalShowingRef.current = props.modalShowing;
  });

  useEffect(() => {
    if (prevAccountIdRef.current !== props.accountId) {
      setLoading(true);
      setSearch('');
      setShowBalances(props.showBalances ?? false);
      setBalances(null);
      setShowCleared(props.showCleared ?? false);
      setShowReconciled(props.showReconciled);
      setReconcileAmount(null);

      const query = makeRootTransactionsQuery();
      rootQueryRef.current = currentQueryRef.current = query;
      updateQuery(query);
      if (props.accountId) {
        dispatch(markAccountRead({ id: props.accountId }));
      }
    }
    // Effect intentionally runs only when accountId or balance/shown props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.accountId,
    props.showBalances,
    props.showCleared,
    props.showReconciled,
  ]);

  // === RENDER ===

  const account = props.accounts.find(
    account => account.id === props.accountId,
  );
  const accountName = getAccountTitle(account, props.accountId);

  if (!accountName && !loading) {
    return <Navigate to="/accounts" replace />;
  }

  const category = props.categoryGroups
    .flatMap(g => g.categories)
    .find(category => category?.id === props.categoryId);

  const showEmptyMessage =
    !loading && !props.accountId && props.accounts.length === 0;
  const showBalancesBool = showBalances ?? false;

  const isNameEditable = props.accountId
    ? props.accountId !== 'onbudget' &&
      props.accountId !== 'offbudget' &&
      props.accountId !== 'uncategorized'
    : false;

  const balanceQuery = getBalanceQuery(props.accountId);

  const selectAllFilter = (item: TransactionEntity): boolean => {
    if (item.is_parent) {
      const children = transactions.filter(t => t.parent_id === item.id);
      return children.every(t => selectAllFilter(t));
    }
    return !item._unmatched;
  };

  return (
    <AllTransactions
      account={account}
      transactions={transactions}
      balances={balances}
      showBalances={showBalancesBool}
      filtered={transactionsFiltered}
    >
      {(allTransactions, allBalances) => (
        <SelectedProviderWithItems
          name="transactions"
          items={
            showReconciled
              ? allTransactions
              : allTransactions.filter(t => !t.reconciled)
          }
          fetchAllIds={fetchAllIds}
          registerDispatch={dispatch =>
            (dispatchSelectedRef.current = dispatch)
          }
          selectAllFilter={selectAllFilter}
        >
          <View style={styles.page}>
            <AccountHeader
              tableRef={tableRef}
              isNameEditable={isNameEditable ?? false}
              workingHard={workingHard ?? false}
              accountId={props.accountId}
              account={account}
              filterId={filterId}
              savedFilters={props.savedFilters}
              accountName={accountName}
              accountsSyncing={props.accountsSyncing}
              accounts={props.accounts}
              transactions={transactions}
              showBalances={showBalancesBool}
              showExtraBalances={props.showExtraBalances ?? false}
              showCleared={showCleared ?? false}
              showReconciled={showReconciled ?? false}
              showEmptyMessage={showEmptyMessage ?? false}
              balanceQuery={balanceQuery}
              canCalculateBalance={canCalculateBalance}
              filteredAmount={filteredAmount}
              isFiltered={transactionsFiltered ?? false}
              isSorted={sort !== null}
              reconcileAmount={reconcileAmount}
              search={search}
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
              onReconcile={onReconcile}
              onDoneReconciling={onDoneReconciling}
              onCreateReconciliationTransaction={
                onCreateReconciliationTransaction
              }
              onSync={onSync}
              onImport={onImport}
              onBatchDelete={onBatchDelete}
              onBatchDuplicate={onBatchDuplicate}
              onRunRules={onRunRules}
              onBatchEdit={onBatchEdit}
              onBatchLinkSchedule={onBatchLinkSchedule}
              onBatchUnlinkSchedule={onBatchUnlinkSchedule}
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
              onMergeTransactions={onMergeTransactions}
            />

            <View style={{ flex: 1 }}>
              <TransactionList
                headerContent={undefined}
                // @ts-expect-error - fix me
                tableRef={tableRef}
                account={account}
                transactions={transactions}
                allTransactions={allTransactions}
                loadMoreTransactions={() =>
                  pagedRef.current && pagedRef.current.fetchNext()
                }
                accounts={props.accounts}
                category={category}
                categoryGroups={props.categoryGroups}
                payees={props.payees}
                balances={allBalances}
                showBalances={!!allBalances}
                showReconciled={showReconciled}
                showCleared={!!showCleared}
                showAccount={
                  !props.accountId ||
                  props.accountId === 'offbudget' ||
                  props.accountId === 'onbudget' ||
                  props.accountId === 'uncategorized'
                }
                allowReorder={
                  !!props.accountId &&
                  props.accountId !== 'offbudget' &&
                  props.accountId !== 'onbudget' &&
                  props.accountId !== 'uncategorized'
                }
                isAdding={isAdding}
                isNew={isNew}
                isMatched={isMatched}
                isFiltered={transactionsFiltered}
                dateFormat={props.dateFormat}
                hideFraction={props.hideFraction}
                renderEmpty={() =>
                  showEmptyMessage ? (
                    <AccountEmptyMessage
                      onAdd={() =>
                        dispatch(
                          replaceModal({
                            modal: { name: 'add-account', options: {} },
                          }),
                        )
                      }
                    />
                  ) : !loading ? (
                    <View
                      style={{
                        color: theme.tableText,
                        marginTop: 20,
                        textAlign: 'center',
                        fontStyle: 'italic',
                      }}
                    >
                      <Trans>No transactions</Trans>
                    </View>
                  ) : null
                }
                onSort={onSort}
                sortField={sort?.field ?? ''}
                ascDesc={sort?.ascDesc ?? 'asc'}
                onChange={onTransactionsChange}
                onBatchDelete={onBatchDelete}
                onBatchDuplicate={onBatchDuplicate}
                onBatchLinkSchedule={onBatchLinkSchedule}
                onBatchUnlinkSchedule={onBatchUnlinkSchedule}
                onCreateRule={onCreateRule}
                onScheduleAction={onScheduleAction}
                onMakeAsNonSplitTransactions={onMakeAsNonSplitTransactions}
                onRefetch={refetchTransactions}
                onCloseAddTransaction={() => setIsAdding(false)}
                onCreatePayee={onCreatePayee}
                onApplyFilter={onApplyFilter}
              />
            </View>
          </View>
        </SelectedProviderWithItems>
      )}
    </AllTransactions>
  );
}

export function Account() {
  const params = useParams();
  const location = useLocation();

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const newTransactions = useSelector(
    state => state.transactions.newTransactions,
  );
  const matchedTransactions = useSelector(
    state => state.transactions.matchedTransactions,
  );
  const { data: accounts = [] } = useAccounts();
  const { data: payees = [] } = usePayees();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [hideFraction] = useSyncedPref('hideFraction');
  const [expandSplits] = useLocalPref('expand-splits');
  const [showBalances, setShowBalances] = useSyncedPref(
    `show-balances-${params.id}`,
  );
  const [showNetWorthChart, setShowNetWorthChart] = useSyncedPref(
    `show-account-${params.id}-net-worth-chart`,
  );
  const [hideCleared, setHideCleared] = useSyncedPref(
    `hide-cleared-${params.id}`,
  );
  const [hideReconciled, setHideReconciled] = useSyncedPref(
    `hide-reconciled-${params.id}`,
  );
  const [showExtraBalances, setShowExtraBalances] = useSyncedPref(
    `show-extra-balances-${params.id || 'all-accounts'}`,
  );
  const modalShowing = useSelector(state => state.modals.modalStack.length > 0);
  const accountsSyncing = useSelector(state => state.account.accountsSyncing);
  const filterConditions = location?.state?.filterConditions || [];

  const savedFiters = useTransactionFilters();

  const schedulesQuery = useMemo(
    () => getSchedulesQuery(params.id),
    [params.id],
  );

  const { mutate: reopenAccount } = useReopenAccountMutation();
  const onReopenAccount = (id: AccountEntity['id']) => reopenAccount({ id });

  const { mutate: updateAccount } = useUpdateAccountMutation();
  const onUpdateAccount = (account: AccountEntity) =>
    updateAccount({ account });

  const { mutate: unlinkAccount } = useUnlinkAccountMutation();
  const onUnlinkAccount = (id: AccountEntity['id']) => unlinkAccount({ id });

  const { mutate: syncAndDownload } = useSyncAndDownloadMutation();
  const onSyncAndDownload = (id?: AccountEntity['id']) =>
    syncAndDownload({ id });

  const createPayee = useCreatePayeeMutation();
  const onCreatePayee = (name: PayeeEntity['name']) =>
    createPayee.mutateAsync({ name });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <SchedulesProvider query={schedulesQuery}>
        <SplitsExpandedProvider
          initialMode={expandSplits ? 'collapse' : 'expand'}
        >
          <AccountInternal
            newTransactions={newTransactions}
            matchedTransactions={matchedTransactions}
            accounts={accounts}
            dateFormat={dateFormat}
            hideFraction={String(hideFraction) === 'true'}
            expandSplits={expandSplits}
            showBalances={String(showBalances) === 'true'}
            setShowBalances={showBalances =>
              setShowBalances(String(showBalances))
            }
            showNetWorthChart={String(showNetWorthChart) === 'true'}
            setShowNetWorthChart={val => setShowNetWorthChart(String(val))}
            showCleared={String(hideCleared) !== 'true'}
            setShowCleared={val => setHideCleared(String(!val))}
            showReconciled={String(hideReconciled) !== 'true'}
            setShowReconciled={val => setHideReconciled(String(!val))}
            showExtraBalances={String(showExtraBalances) === 'true'}
            setShowExtraBalances={extraBalances =>
              setShowExtraBalances(String(extraBalances))
            }
            payees={payees}
            modalShowing={modalShowing}
            accountsSyncing={accountsSyncing}
            filterConditions={filterConditions}
            categoryGroups={categoryGroups}
            accountId={params.id}
            categoryId={location?.state?.categoryId}
            location={location}
            savedFilters={savedFiters}
            onReopenAccount={onReopenAccount}
            onUpdateAccount={onUpdateAccount}
            onUnlinkAccount={onUnlinkAccount}
            onSyncAndDownload={onSyncAndDownload}
            onCreatePayee={onCreatePayee}
          />
        </SplitsExpandedProvider>
      </SchedulesProvider>
    </ErrorBoundary>
  );
}
