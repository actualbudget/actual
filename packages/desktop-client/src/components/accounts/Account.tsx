// @ts-strict-ignore
import React, {
  PureComponent,
  type MutableRefObject,
  createRef,
  useMemo,
  type ReactElement,
} from 'react';
import { Trans } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Navigate, useParams, useLocation } from 'react-router-dom';

import { debounce } from 'debounce';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

import { validForTransfer } from 'loot-core/client/transfer';
import { type UndoState } from 'loot-core/server/undo';
import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import {
  SchedulesProvider,
  useDefaultSchedulesQueryTransform,
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import { runQuery, pagedQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { currentDay } from 'loot-core/src/shared/months';
import { q, type Query } from 'loot-core/src/shared/query';
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
  type PayeeEntity,
  type RuleConditionEntity,
  type TransactionEntity,
  type TransactionFilterEntity,
} from 'loot-core/src/types/models';

import { useAccounts } from '../../hooks/useAccounts';
import { useActions } from '../../hooks/useActions';
import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useFailedAccounts } from '../../hooks/useFailedAccounts';
import { useLocalPref } from '../../hooks/useLocalPref';
import { usePayees } from '../../hooks/usePayees';
import { usePreviewTransactions } from '../../hooks/usePreviewTransactions';
import {
  SelectedProviderWithItems,
  type Actions,
} from '../../hooks/useSelected';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '../../hooks/useSplitsExpanded';
import { useSyncedPref } from '../../hooks/useSyncedPref';
import { useTransactionBatchActions } from '../../hooks/useTransactionBatchActions';
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

type AllTransactionsProps = {
  account?: AccountEntity;
  transactions: TransactionEntity[];
  balances: Record<string, { balance: number }> | null;
  showBalances?: boolean;
  filtered?: boolean;
  children: (
    transactions: TransactionEntity[],
    balances: Record<string, { balance: number }> | null,
  ) => ReactElement;
  collapseTransactions: (ids: string[]) => void;
};

function AllTransactions({
  account,
  transactions,
  balances,
  showBalances,
  filtered,
  children,
  collapseTransactions,
}: AllTransactionsProps) {
  const accountId = account?.id;
  const prependTransactions: (TransactionEntity & { _inverse?: boolean })[] =
    usePreviewTransactions(collapseTransactions).map(trans => ({
      ...trans,
      _inverse: accountId ? accountId !== trans.account : false,
    }));

  transactions ??= [];

  let runningBalance = useMemo(() => {
    if (!showBalances) {
      return 0;
    }

    return balances && transactions?.length > 0
      ? (balances[transactions[0].id]?.balance ?? 0)
      : 0;
  }, [showBalances, balances, transactions]);

  const prependBalances = useMemo(() => {
    if (!showBalances) {
      return null;
    }

    // Reverse so we can calculate from earliest upcoming schedule.
    const scheduledBalances = [...prependTransactions]
      .reverse()
      .map(scheduledTransaction => {
        const amount =
          (scheduledTransaction._inverse ? -1 : 1) *
          getScheduledAmount(scheduledTransaction.amount);
        return {
          // TODO: fix me
          // eslint-disable-next-line react-hooks/exhaustive-deps
          balance: (runningBalance += amount),
          id: scheduledTransaction.id,
        };
      });
    return groupById(scheduledBalances);
  }, [showBalances, prependTransactions, runningBalance]);

  const allTransactions = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependTransactions.length > 0) {
      return prependTransactions.concat(transactions);
    }
    return transactions;
  }, [filtered, prependTransactions, transactions]);

  const allBalances = useMemo(() => {
    // Don't prepend scheduled transactions if we are filtering
    if (!filtered && prependBalances && balances) {
      return { ...prependBalances, ...balances };
    }
    return balances;
  }, [filtered, prependBalances, balances]);

  if (!prependTransactions) {
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
  accountId?: string;
  filterConditions: RuleConditionEntity[];
  showBalances?: boolean;
  setShowBalances: (newValue: boolean) => void;
  showCleared?: boolean;
  setShowCleared: (newValue: boolean) => void;
  showReconciled: boolean;
  setShowReconciled: (newValue: boolean) => void;
  showExtraBalances?: boolean;
  setShowExtraBalances: (newValue: boolean) => void;
  modalShowing?: boolean;
  setLastUndoState: (state: null) => void;
  lastUndoState: { current: UndoState | null };
  accounts: AccountEntity[];
  getPayees: () => Promise<PayeeEntity[]>;
  updateAccount: (newAccount: AccountEntity) => void;
  newTransactions: string[];
  matchedTransactions: string[];
  splitsExpandedDispatch: ReturnType<typeof useSplitsExpanded>['dispatch'];
  expandSplits?: boolean;
  savedFilters: TransactionFilterEntity[];
  onBatchEdit: ReturnType<typeof useTransactionBatchActions>['onBatchEdit'];
  onBatchDuplicate: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchDuplicate'];
  onBatchLinkSchedule: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchLinkSchedule'];
  onBatchUnlinkSchedule: ReturnType<
    typeof useTransactionBatchActions
  >['onBatchUnlinkSchedule'];
  onBatchDelete: ReturnType<typeof useTransactionBatchActions>['onBatchDelete'];
  categoryId?: string;
  location: ReturnType<typeof useLocation>;
  failedAccounts: ReturnType<typeof useFailedAccounts>;
  dateFormat: ReturnType<typeof useDateFormat>;
  payees: ReturnType<typeof usePayees>;
  categoryGroups: ReturnType<typeof useCategories>['grouped'];
  hideFraction: boolean;
  accountsSyncing: string[];
} & ReturnType<typeof useActions>;
type AccountInternalState = {
  search: string;
  filterConditions: ConditionEntity[];
  filterId?: SavedFilter;
  filterConditionsOp: 'and' | 'or';
  loading: boolean;
  workingHard: boolean;
  reconcileAmount: null | number;
  transactions: TransactionEntity[];
  transactionCount: number;
  transactionsFiltered?: boolean;
  showBalances?: boolean;
  balances: Record<string, { balance: number }> | null;
  showCleared?: boolean;
  prevShowCleared?: boolean;
  showReconciled: boolean;
  editingName: boolean;
  nameError: string;
  isAdding: boolean;
  modalShowing?: boolean;
  sort: {
    ascDesc: 'asc' | 'desc';
    field: string;
    prevField?: string;
    prevAscDesc?: 'asc' | 'desc';
  } | null;
  filteredAmount: null | number;
};

export type TableRef = MutableRefObject<{
  edit: (updatedId: string | null, op?: string, someBool?: boolean) => void;
  setRowAnimation: (animation: boolean) => void;
  scrollTo: (focusId: string) => void;
  scrollToTop: () => void;
  getScrolledItem: () => string;
} | null>;

class AccountInternal extends PureComponent<
  AccountInternalProps,
  AccountInternalState
> {
  paged: ReturnType<typeof pagedQuery> | null;
  rootQuery: Query;
  currentQuery: Query;
  table: TableRef;
  unlisten?: () => void;
  dispatchSelected?: (action: Actions) => void;

  constructor(props: AccountInternalProps) {
    super(props);
    this.paged = null;
    this.table = createRef();

    this.state = {
      search: '',
      filterConditions: props.filterConditions || [],
      filterId: undefined,
      filterConditionsOp: 'and',
      loading: true,
      workingHard: false,
      reconcileAmount: null,
      transactions: [],
      transactionCount: 0,
      showBalances: props.showBalances,
      balances: null,
      showCleared: props.showCleared,
      showReconciled: props.showReconciled,
      editingName: false,
      nameError: '',
      isAdding: false,
      sort: null,
      filteredAmount: null,
    };
  }

  async componentDidMount() {
    const maybeRefetch = (tables: string[]) => {
      if (
        tables.includes('transactions') ||
        tables.includes('category_mapping') ||
        tables.includes('payee_mapping')
      ) {
        return this.refetchTransactions();
      }
    };

    const onUndo = async ({ tables, messages }: UndoState) => {
      await maybeRefetch(tables);

      // If all the messages are dealing with transactions, find the
      // first message referencing a non-deleted row so that we can
      // highlight the row
      //
      let focusId: null | string;
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

    const unlistens = [listen('undo-event', onUndo)];

    this.unlisten = () => {
      unlistens.forEach(unlisten => unlisten());
    };

    // Important that any async work happens last so that the
    // listeners are set up synchronously
    await this.props.initiallyLoadPayees();
    await this.fetchTransactions(this.state.filterConditions);

    // If there is a pending undo, apply it immediately (this happens
    // when an undo changes the location to this page)
    if (this.props.lastUndoState && this.props.lastUndoState.current) {
      onUndo(this.props.lastUndoState.current);
    }
  }

  componentDidUpdate(prevProps: AccountInternalProps) {
    // If the active account changes - close the transaction entry mode
    if (this.state.isAdding && this.props.accountId !== prevProps.accountId) {
      this.setState({ isAdding: false });
    }

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

    //Resest sort/filter/search on account change
    if (this.props.accountId !== prevProps.accountId) {
      this.setState({ sort: null, search: '', filterConditions: [] });
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
    const { data } = await runQuery(this.paged?.getQuery().select('id'));
    // Remember, this is the `grouped` split type so we need to deal
    // with the `subtransactions` property
    return data.reduce((arr: string[], t: TransactionEntity) => {
      arr.push(t.id);
      t.subtransactions?.forEach(sub => arr.push(sub.id));
      return arr;
    }, []);
  };

  refetchTransactions = async () => {
    this.paged?.run();
  };

  fetchTransactions = (filterConditions?: ConditionEntity[]) => {
    const query = this.makeRootQuery();
    this.rootQuery = this.currentQuery = query;
    if (filterConditions) this.applyFilters(filterConditions);
    else this.updateQuery(query);

    if (this.props.accountId) {
      this.props.markAccountRead(this.props.accountId);
    }
  };

  makeRootQuery = () => {
    const accountId = this.props.accountId;

    return queries.makeTransactionsQuery(accountId);
  };

  updateQuery(query: Query, isFiltered: boolean = false) {
    if (this.paged) {
      this.paged.unsubscribe();
    }

    // Filter out reconciled transactions if they are hidden
    // and we're not showing balances.
    if (
      !this.state.showReconciled &&
      (!this.state.showBalances || !this.canCalculateBalance())
    ) {
      query = query.filter({ reconciled: { $eq: false } });
    }

    this.paged = pagedQuery(
      query.select('*'),
      async (
        data: TransactionEntity[],
        prevData: TransactionEntity[] | null,
      ) => {
        const firstLoad = prevData == null;

        if (firstLoad) {
          this.table.current?.setRowAnimation(false);

          if (isFiltered) {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: 'collapse',
            });
          } else {
            this.props.splitsExpandedDispatch({
              type: 'set-mode',
              mode: this.props.expandSplits ? 'expand' : 'collapse',
            });
          }
        }

        this.setState(
          {
            transactions: data,
            transactionCount: this.paged?.getTotalCount(),
            transactionsFiltered: isFiltered,
            loading: false,
            workingHard: false,
            balances: this.state.showBalances
              ? await this.calculateBalances()
              : null,
            filteredAmount: await this.getFilteredAmount(),
          },
          () => {
            if (firstLoad) {
              this.table.current?.scrollToTop();
            }

            setTimeout(() => {
              this.table.current?.setRowAnimation(true);
            }, 0);
          },
        );
      },
      {
        pageCount: 150,
        onlySync: true,
        mapper: ungroupTransactions,
      },
    );
  }

  UNSAFE_componentWillReceiveProps(nextProps: AccountInternalProps) {
    if (this.props.accountId !== nextProps.accountId) {
      this.setState(
        {
          editingName: false,
          loading: true,
          search: '',
          showBalances: nextProps.showBalances,
          balances: null,
          showCleared: nextProps.showCleared,
          showReconciled: nextProps.showReconciled,
          reconcileAmount: null,
        },
        () => {
          this.fetchTransactions();
        },
      );
    }
  }

  onSearch = (value: string) => {
    this.paged?.unsubscribe();
    this.setState({ search: value }, this.onSearchDone);
  };

  onSearchDone = debounce(() => {
    if (this.state.search === '') {
      this.updateQuery(
        this.currentQuery,
        this.state.filterConditions.length > 0,
      );
    } else {
      this.updateQuery(
        queries.makeTransactionSearchQuery(
          this.currentQuery,
          this.state.search,
          this.props.dateFormat,
        ),
        true,
      );
    }
  }, 150);

  onSync = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);

    await this.props.syncAndDownload(account ? account.id : undefined);
  };

  onImport = async () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(acct => acct.id === accountId);
    const categories = await this.props.getCategories();

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
        this.props.pushModal('import-transactions', {
          accountId,
          categories,
          filename: res[0],
          onImported: (didChange: boolean) => {
            if (didChange) {
              this.fetchTransactions();
            }
          },
        });
      }
    }
  };

  onExport = async (accountName: string) => {
    const exportedTransactions = await send('transactions-export-query', {
      query: this.currentQuery.serialize(),
    });
    const normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    const filename = `${normalizedName || 'transactions'}.csv`;

    window.Actual?.saveFile(
      exportedTransactions,
      filename,
      t('Export Transactions'),
    );
  };

  onTransactionsChange = (
    newTransaction: TransactionEntity,
    data: TransactionEntity[],
  ) => {
    // Apply changes to pagedQuery data
    this.paged?.optimisticUpdate(
      (data: TransactionEntity[]) => {
        if (newTransaction._deleted) {
          return data.filter(t => t.id !== newTransaction.id);
        } else {
          return data.map(t => {
            return t.id === newTransaction.id ? newTransaction : t;
          });
        }
      },
      () => {
        return data;
      },
    );

    this.props.updateNewTransactions(newTransaction.id);
  };

  canCalculateBalance = () => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );
    return (
      account &&
      this.state.search === '' &&
      this.state.filterConditions.length === 0 &&
      (this.state.sort === null ||
        (this.state.sort.field === 'date' &&
          this.state.sort.ascDesc === 'desc'))
    );
  };

  async calculateBalances() {
    if (!this.canCalculateBalance()) {
      return null;
    }

    const { data } = await runQuery(
      this.paged
        ?.getQuery()
        .options({ splits: 'none' })
        .select([{ balance: { $sumOver: '$amount' } }]),
    );

    return groupById<{ id: string; balance: number }>(data);
  }

  onAddTransaction = () => {
    this.setState({ isAdding: true });
  };

  onExposeName = (flag: boolean) => {
    this.setState({ editingName: flag });
  };

  onSaveName = (name: string) => {
    const accountNameError = validateAccountName(
      name,
      this.props.accountId,
      this.props.accounts,
    );
    if (accountNameError) {
      this.setState({ nameError: accountNameError });
    } else {
      const account = this.props.accounts.find(
        account => account.id === this.props.accountId,
      );
      this.props.updateAccount({ ...account, name });
      this.setState({ editingName: false, nameError: '' });
    }
  };

  onToggleExtraBalances = () => {
    this.props.setShowExtraBalances(!this.props.showExtraBalances);
  };

  onMenuSelect = async (
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
    const accountId = this.props.accountId!;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    )!;

    switch (item) {
      case 'link':
        this.props.pushModal('add-account', {
          upgradingAccountId: accountId,
        });
        break;
      case 'unlink':
        this.props.pushModal('confirm-unlink-account', {
          accountName: account.name,
          onUnlink: () => {
            this.props.unlinkAccount(accountId);
          },
        });
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
          this.props.setShowBalances(false);
          this.setState({ showBalances: false, balances: null });
        } else {
          this.props.setShowBalances(true);
          this.setState(
            {
              transactions: [],
              transactionCount: 0,
              filterConditions: [],
              search: '',
              sort: null,
              showBalances: true,
            },
            () => {
              this.fetchTransactions();
            },
          );
        }
        break;
      case 'remove-sorting': {
        this.setState({ sort: null }, () => {
          const filterConditions = this.state.filterConditions;
          if (filterConditions.length > 0) {
            this.applyFilters([...filterConditions]);
          } else {
            this.fetchTransactions();
          }
          if (this.state.search !== '') {
            this.onSearch(this.state.search);
          }
        });
        break;
      }
      case 'toggle-cleared':
        if (this.state.showCleared) {
          this.props.setShowCleared(false);
          this.setState({ showCleared: false });
        } else {
          this.props.setShowCleared(true);
          this.setState({ showCleared: true });
        }
        break;
      case 'toggle-reconciled':
        if (this.state.showReconciled) {
          this.props.setShowReconciled(false);
          this.setState({ showReconciled: false }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        } else {
          this.props.setShowReconciled(true);
          this.setState({ showReconciled: true }, () =>
            this.fetchTransactions(this.state.filterConditions),
          );
        }
        break;
      default:
    }
  };

  getAccountTitle(account?: AccountEntity, id?: string) {
    const { filterName } = this.props.location.state || {};

    if (filterName) {
      return filterName;
    }

    if (!account) {
      if (id === 'budgeted') {
        return t('Budgeted Accounts');
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

  getBalanceQuery(id?: string) {
    return {
      name: `balance-query-${id}`,
      query: this.makeRootQuery().calculate({ $sum: '$amount' }),
    } as const;
  }

  getFilteredAmount = async () => {
    const { data: amount } = await runQuery(
      this.paged?.getQuery().calculate({ $sum: '$amount' }),
    );
    return amount;
  };

  isNew = (id: string) => {
    return this.props.newTransactions.includes(id);
  };

  isMatched = (id: string) => {
    return this.props.matchedTransactions.includes(id);
  };

  onCreatePayee = (name: string) => {
    const trimmed = name.trim();
    if (trimmed !== '') {
      return this.props.createPayee(name);
    }
    return null;
  };

  lockTransactions = async () => {
    this.setState({ workingHard: true });

    const { accountId } = this.props;

    const { data } = await runQuery(
      q('transactions')
        .filter({ cleared: true, reconciled: false, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    let transactions = ungroupTransactions(data);

    const changes: { updated: Array<Partial<TransactionEntity>> } = {
      updated: [],
    };

    transactions.forEach(trans => {
      const { diff } = updateTransaction(transactions, {
        ...trans,
        reconciled: true,
      });

      transactions = applyChanges(diff, transactions);

      changes.updated = changes.updated
        ? changes.updated.concat(diff.updated)
        : diff.updated;
    });

    await send('transactions-batch-update', changes);
    await this.refetchTransactions();
  };

  onReconcile = async (balance: number) => {
    this.setState(({ showCleared }) => ({
      reconcileAmount: balance,
      showCleared: true,
      prevShowCleared: showCleared,
    }));
  };

  onDoneReconciling = async () => {
    const { accountId } = this.props;
    const { reconcileAmount } = this.state;

    const { data } = await runQuery(
      q('transactions')
        .filter({ cleared: true, account: accountId })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);

    let cleared = 0;

    transactions.forEach(trans => {
      if (!trans.is_parent) {
        cleared += trans.amount;
      }
    });

    const targetDiff = (reconcileAmount || 0) - cleared;

    if (targetDiff === 0) {
      await this.lockTransactions();
    }

    this.setState({
      reconcileAmount: null,
      showCleared: this.state.prevShowCleared,
    });
  };

  onCreateReconciliationTransaction = async (diff: number) => {
    // Create a new reconciliation transaction
    const reconciliationTransactions = realizeTempTransactions([
      {
        id: 'temp',
        account: this.props.accountId!,
        cleared: true,
        reconciled: false,
        amount: diff,
        date: currentDay(),
        notes: t('Reconciliation balance adjustment'),
      },
    ]);

    // Optimistic UI: update the transaction list before sending the data to the database
    this.setState({
      transactions: [...reconciliationTransactions, ...this.state.transactions],
    });

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
    await this.refetchTransactions();
  };

  onShowTransactions = async (ids: string[]) => {
    this.onApplyFilter({
      customName: t('Selected transactions'),
      queryFilter: { id: { $oneof: ids } },
    });
  };

  onBatchEdit = (name: keyof TransactionEntity, ids: string[]) => {
    this.props.onBatchEdit({
      name,
      ids,
      onSuccess: updatedIds => {
        this.refetchTransactions();

        if (this.table.current) {
          this.table.current.edit(updatedIds[0], 'select', false);
        }
      },
    });
  };

  onBatchDuplicate = (ids: string[]) => {
    this.props.onBatchDuplicate({ ids, onSuccess: this.refetchTransactions });
  };

  onBatchDelete = (ids: string[]) => {
    this.props.onBatchDelete({ ids, onSuccess: this.refetchTransactions });
  };

  onMakeAsSplitTransaction = async (ids: string[]) => {
    this.setState({ workingHard: true });

    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'none' }),
    );

    const transactions: TransactionEntity[] = data;

    if (!transactions || transactions.length === 0) {
      return;
    }

    const [firstTransaction] = transactions;
    const parentTransaction = {
      id: uuidv4(),
      is_parent: true,
      cleared: transactions.every(t => !!t.cleared),
      date: firstTransaction.date,
      account: firstTransaction.account,
      amount: transactions
        .map(t => t.amount)
        .reduce((total, amount) => total + amount, 0),
    };
    const childTransactions = transactions.map(t =>
      makeChild(parentTransaction, t),
    );

    await send('transactions-batch-update', {
      added: [parentTransaction],
      updated: childTransactions,
    });

    this.refetchTransactions();
  };

  onMakeAsNonSplitTransactions = async (ids: string[]) => {
    this.setState({ workingHard: true });

    const { data } = await runQuery(
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

    this.refetchTransactions();

    const transactionsToSelect = changes.updated.map(t => t.id);
    this.dispatchSelected?.({
      type: 'select-all',
      ids: transactionsToSelect,
    });
  };

  checkForReconciledTransactions = async (
    ids: string[],
    confirmReason: string,
    onConfirm: (ids: string[]) => void,
  ) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids }, reconciled: true })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    const transactions = ungroupTransactions(data);
    if (transactions.length > 0) {
      this.props.pushModal('confirm-transaction-edit', {
        onConfirm: () => {
          onConfirm(ids);
        },
        confirmReason,
      });
    } else {
      onConfirm(ids);
    }
  };

  onBatchLinkSchedule = (ids: string[]) => {
    this.props.onBatchLinkSchedule({
      ids,
      account: this.props.accounts.find(a => a.id === this.props.accountId),
      onSuccess: this.refetchTransactions,
    });
  };

  onBatchUnlinkSchedule = (ids: string[]) => {
    this.props.onBatchUnlinkSchedule({
      ids,
      onSuccess: this.refetchTransactions,
    });
  };

  onCreateRule = async (ids: string[]) => {
    const { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    const transactions = ungroupTransactions(data);
    const ruleTransaction = transactions[0];
    const childTransactions = transactions.filter(
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

    this.props.pushModal('edit-rule', { rule });
  };

  onSetTransfer = async (ids: string[]) => {
    const onConfirmTransfer = async (ids: string[]) => {
      this.setState({ workingHard: true });

      const payees = await this.props.getPayees();
      const { data: transactions } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*'),
      );
      const [fromTrans, toTrans] = transactions;

      if (transactions.length === 2 && validForTransfer(fromTrans, toTrans)) {
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

      await this.refetchTransactions();
    };

    await this.checkForReconciledTransactions(
      ids,
      'batchEditWithReconciled',
      onConfirmTransfer,
    );
  };

  onConditionsOpChange = (value: 'and' | 'or') => {
    this.setState({ filterConditionsOp: value });
    this.setState({ filterId: { ...this.state.filterId, status: 'changed' } });
    this.applyFilters([...this.state.filterConditions]);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onReloadSavedFilter = (savedFilter: SavedFilter, item: string) => {
    if (item === 'reload') {
      const [savedFilter] = this.props.savedFilters.filter(
        f => f.id === this.state.filterId?.id,
      );
      this.setState({ filterConditionsOp: savedFilter.conditionsOp ?? 'and' });
      this.applyFilters([...savedFilter.conditions]);
    } else {
      if (savedFilter.status) {
        this.setState({
          filterConditionsOp: savedFilter.conditionsOp ?? 'and',
        });
        this.applyFilters([...savedFilter.conditions]);
      }
    }
    this.setState({ filterId: { ...this.state.filterId, ...savedFilter } });
  };

  onClearFilters = () => {
    this.setState({ filterConditionsOp: 'and' });
    this.setState({ filterId: undefined });
    this.applyFilters([]);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onUpdateFilter = (
    oldCondition: RuleConditionEntity,
    updatedCondition: RuleConditionEntity,
  ) => {
    this.applyFilters(
      this.state.filterConditions.map(c =>
        c === oldCondition ? updatedCondition : c,
      ),
    );
    this.setState({
      filterId: {
        ...this.state.filterId,
        status: this.state.filterId && 'changed',
      },
    });
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onDeleteFilter = (condition: RuleConditionEntity) => {
    this.applyFilters(this.state.filterConditions.filter(c => c !== condition));
    if (this.state.filterConditions.length === 1) {
      this.setState({ filterId: undefined });
      this.setState({ filterConditionsOp: 'and' });
    } else {
      this.setState({
        filterId: {
          ...this.state.filterId,
          status: this.state.filterId && 'changed',
        },
      });
    }
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onApplyFilter = async (conditionOrSavedFilter: ConditionEntity) => {
    let filterConditions = this.state.filterConditions;

    if (
      'customName' in conditionOrSavedFilter &&
      conditionOrSavedFilter.customName
    ) {
      filterConditions = filterConditions.filter(
        c =>
          !isTransactionFilterEntity(c) &&
          c.customName !== conditionOrSavedFilter.customName,
      );
    }

    if (isTransactionFilterEntity(conditionOrSavedFilter)) {
      // A saved filter was passed in.
      const savedFilter = conditionOrSavedFilter;
      this.setState({
        filterId: { ...savedFilter, status: 'saved' },
      });
      this.setState({ filterConditionsOp: savedFilter.conditionsOp });
      this.applyFilters([...savedFilter.conditions]);
    } else {
      // A condition was passed in.
      const condition = conditionOrSavedFilter;
      this.setState({
        filterId: {
          ...this.state.filterId,
          status: this.state.filterId && 'changed',
        },
      });
      this.applyFilters([...filterConditions, condition]);
    }

    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  onScheduleAction = async (
    name: 'skip' | 'post-transaction',
    ids: string[],
  ) => {
    switch (name) {
      case 'post-transaction':
        for (const id of ids) {
          const parts = id.split('/');
          await send('schedule/post-transaction', { id: parts[1] });
        }
        this.refetchTransactions();
        break;
      case 'skip':
        for (const id of ids) {
          const parts = id.split('/');
          await send('schedule/skip-next-date', { id: parts[1] });
        }
        break;
      default:
    }
  };

  applyFilters = async (conditions: ConditionEntity[]) => {
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
      const conditionsOpKey =
        this.state.filterConditionsOp === 'or' ? '$or' : '$and';
      this.currentQuery = this.rootQuery.filter({
        [conditionsOpKey]: [...queryFilters, ...customQueryFilters],
      });

      this.setState(
        {
          filterConditions: conditions,
        },
        () => {
          this.updateQuery(this.currentQuery, true);
        },
      );
    } else {
      this.setState(
        {
          transactions: [],
          transactionCount: 0,
          filterConditions: conditions,
        },
        () => {
          this.fetchTransactions();
        },
      );
    }

    if (this.state.sort !== null) {
      this.applySort();
    }
  };

  applySort = (
    field?: string,
    ascDesc?: 'asc' | 'desc',
    prevField?: string,
    prevAscDesc?: 'asc' | 'desc',
  ) => {
    const filterConditions = this.state.filterConditions;
    const isFiltered = filterConditions.length > 0;
    const sortField = getField(!field ? this.state.sort?.field : field);
    const sortAscDesc = !ascDesc ? this.state.sort?.ascDesc : ascDesc;
    const sortPrevField = getField(
      !prevField ? this.state.sort?.prevField : prevField,
    );
    const sortPrevAscDesc = !prevField
      ? this.state.sort?.prevAscDesc
      : prevAscDesc;

    const sortCurrentQuery = function (
      that: AccountInternal,
      sortField: string,
      sortAscDesc?: 'asc' | 'desc',
    ) {
      if (sortField === 'cleared') {
        that.currentQuery = that.currentQuery.orderBy({
          reconciled: sortAscDesc,
        });
      }

      that.currentQuery = that.currentQuery.orderBy({
        [sortField]: sortAscDesc,
      });
    };

    const sortRootQuery = function (
      that: AccountInternal,
      sortField: string,
      sortAscDesc?: 'asc' | 'desc',
    ) {
      if (sortField === 'cleared') {
        that.currentQuery = that.rootQuery.orderBy({
          reconciled: sortAscDesc,
        });
        that.currentQuery = that.currentQuery.orderBy({
          cleared: sortAscDesc,
        });
      } else {
        that.currentQuery = that.rootQuery.orderBy({
          [sortField]: sortAscDesc,
        });
      }
    };

    // sort by previously used sort field, if any
    const maybeSortByPreviousField = function (
      that: AccountInternal,
      sortPrevField: string,
      sortPrevAscDesc?: 'asc' | 'desc',
    ) {
      if (!sortPrevField) {
        return;
      }

      if (sortPrevField === 'cleared') {
        that.currentQuery = that.currentQuery.orderBy({
          reconciled: sortPrevAscDesc,
        });
      }

      that.currentQuery = that.currentQuery.orderBy({
        [sortPrevField]: sortPrevAscDesc,
      });
    };

    switch (true) {
      // called by applyFilters to sort an already filtered result
      case !field:
        sortCurrentQuery(this, sortField, sortAscDesc);
        break;

      // called directly from UI by sorting a column.
      // active filters need to be applied before sorting
      case isFiltered:
        this.applyFilters([...filterConditions]);
        sortCurrentQuery(this, sortField, sortAscDesc);
        break;

      // called directly from UI by sorting a column.
      // no active filters, start a new root query.
      case !isFiltered:
        sortRootQuery(this, sortField, sortAscDesc);
        break;

      default:
    }

    maybeSortByPreviousField(this, sortPrevField, sortPrevAscDesc);
    this.updateQuery(this.currentQuery, isFiltered);
  };

  onSort = (headerClicked: string, ascDesc: 'asc' | 'desc') => {
    let prevField: string | undefined;
    let prevAscDesc: 'asc' | 'desc' | undefined;
    //if staying on same column but switching asc/desc
    //then keep prev the same
    if (headerClicked === this.state.sort?.field) {
      prevField = this.state.sort.prevField;
      prevAscDesc = this.state.sort.prevAscDesc;
      this.setState({
        sort: {
          ...this.state.sort,
          ascDesc,
        },
      });
    } else {
      //if switching to new column then capture state
      //of current sort column as prev
      prevField = this.state.sort?.field;
      prevAscDesc = this.state.sort?.ascDesc;
      this.setState({
        sort: {
          field: headerClicked,
          ascDesc,
          prevField: this.state.sort?.field,
          prevAscDesc: this.state.sort?.ascDesc,
        },
      });
    }

    this.applySort(headerClicked, ascDesc, prevField, prevAscDesc);
    if (this.state.search !== '') {
      this.onSearch(this.state.search);
    }
  };

  render() {
    const {
      accounts,
      categoryGroups,
      payees,
      dateFormat,
      hideFraction,
      addNotification,
      accountsSyncing,
      failedAccounts,
      replaceModal,
      showExtraBalances,
      accountId,
      categoryId,
    } = this.props;
    const {
      transactions,
      loading,
      workingHard,
      filterId,
      reconcileAmount,
      transactionsFiltered,
      editingName,
      showBalances,
      balances,
      showCleared,
      showReconciled,
      filteredAmount,
    } = this.state;

    const account = accounts.find(account => account.id === accountId);
    const accountName = this.getAccountTitle(account, accountId);

    if (!accountName && !loading) {
      // This is probably an account that was deleted, so redirect to
      // all accounts
      return <Navigate to="/accounts" replace />;
    }

    const category = categoryGroups
      .flatMap(g => g.categories)
      .find(category => category?.id === categoryId);

    const showEmptyMessage = !loading && !accountId && accounts.length === 0;

    const isNameEditable =
      accountId &&
      accountId !== 'budgeted' &&
      accountId !== 'offbudget' &&
      accountId !== 'uncategorized';

    const balanceQuery = this.getBalanceQuery(accountId);

    return (
      <AllTransactions
        account={account}
        transactions={transactions}
        balances={balances}
        showBalances={showBalances}
        filtered={transactionsFiltered}
        collapseTransactions={ids =>
          this.props.splitsExpandedDispatch({ type: 'close-splits', ids })
        }
      >
        {(allTransactions, allBalances) => (
          <SelectedProviderWithItems
            name="transactions"
            items={allTransactions}
            fetchAllIds={this.fetchAllIds}
            registerDispatch={dispatch => (this.dispatchSelected = dispatch)}
            selectAllFilter={item => !item._unmatched && !item.is_parent}
          >
            <View style={styles.page}>
              <AccountHeader
                tableRef={this.table}
                editingName={editingName}
                isNameEditable={isNameEditable}
                workingHard={workingHard}
                account={account}
                filterId={filterId}
                savedFilters={this.props.savedFilters}
                accountName={accountName}
                accountsSyncing={accountsSyncing}
                failedAccounts={failedAccounts}
                accounts={accounts}
                transactions={transactions}
                showBalances={showBalances}
                showExtraBalances={showExtraBalances}
                showCleared={showCleared}
                showReconciled={showReconciled}
                showEmptyMessage={showEmptyMessage}
                balanceQuery={balanceQuery}
                canCalculateBalance={this.canCalculateBalance}
                filteredAmount={filteredAmount}
                isFiltered={transactionsFiltered}
                isSorted={this.state.sort !== null}
                reconcileAmount={reconcileAmount}
                search={this.state.search}
                // @ts-expect-error fix me
                filterConditions={this.state.filterConditions}
                filterConditionsOp={this.state.filterConditionsOp}
                onSearch={this.onSearch}
                onShowTransactions={this.onShowTransactions}
                onMenuSelect={this.onMenuSelect}
                onAddTransaction={this.onAddTransaction}
                onToggleExtraBalances={this.onToggleExtraBalances}
                onSaveName={this.onSaveName}
                saveNameError={this.state.nameError}
                onExposeName={this.onExposeName}
                onReconcile={this.onReconcile}
                onDoneReconciling={this.onDoneReconciling}
                onCreateReconciliationTransaction={
                  this.onCreateReconciliationTransaction
                }
                onSync={this.onSync}
                onImport={this.onImport}
                onBatchDelete={this.onBatchDelete}
                onBatchDuplicate={this.onBatchDuplicate}
                onBatchEdit={this.onBatchEdit}
                onBatchLinkSchedule={this.onBatchLinkSchedule}
                onBatchUnlinkSchedule={this.onBatchUnlinkSchedule}
                onCreateRule={this.onCreateRule}
                onUpdateFilter={this.onUpdateFilter}
                onClearFilters={this.onClearFilters}
                onReloadSavedFilter={this.onReloadSavedFilter}
                onConditionsOpChange={this.onConditionsOpChange}
                onDeleteFilter={this.onDeleteFilter}
                onApplyFilter={this.onApplyFilter}
                onScheduleAction={this.onScheduleAction}
                onSetTransfer={this.onSetTransfer}
                onMakeAsSplitTransaction={this.onMakeAsSplitTransaction}
                onMakeAsNonSplitTransactions={this.onMakeAsNonSplitTransactions}
              />

              <View style={{ flex: 1 }}>
                <TransactionList
                  headerContent={undefined}
                  tableRef={this.table}
                  account={account}
                  transactions={transactions}
                  allTransactions={allTransactions}
                  loadMoreTransactions={() =>
                    this.paged && this.paged.fetchNext()
                  }
                  accounts={accounts}
                  category={category}
                  categoryGroups={categoryGroups}
                  payees={payees}
                  balances={allBalances}
                  showBalances={!!allBalances}
                  showReconciled={showReconciled}
                  showCleared={showCleared}
                  showAccount={
                    !accountId ||
                    accountId === 'offbudget' ||
                    accountId === 'budgeted' ||
                    accountId === 'uncategorized'
                  }
                  isAdding={this.state.isAdding}
                  isNew={this.isNew}
                  isMatched={this.isMatched}
                  isFiltered={transactionsFiltered}
                  dateFormat={dateFormat}
                  hideFraction={hideFraction}
                  addNotification={addNotification}
                  renderEmpty={() =>
                    showEmptyMessage ? (
                      <EmptyMessage onAdd={() => replaceModal('add-account')} />
                    ) : !loading ? (
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
                  onSort={this.onSort}
                  sortField={this.state.sort?.field}
                  ascDesc={this.state.sort?.ascDesc}
                  onChange={this.onTransactionsChange}
                  onRefetch={this.refetchTransactions}
                  onCloseAddTransaction={() =>
                    this.setState({ isAdding: false })
                  }
                  onCreatePayee={this.onCreatePayee}
                  onApplyFilter={this.onApplyFilter}
                />
              </View>
            </View>
          </SelectedProviderWithItems>
        )}
      </AllTransactions>
    );
  }
}

type AccountHackProps = Omit<
  AccountInternalProps,
  | 'splitsExpandedDispatch'
  | 'onBatchEdit'
  | 'onBatchDuplicate'
  | 'onBatchLinkSchedule'
  | 'onBatchUnlinkSchedule'
  | 'onBatchDelete'
>;

function AccountHack(props: AccountHackProps) {
  const { dispatch: splitsExpandedDispatch } = useSplitsExpanded();
  const {
    onBatchEdit,
    onBatchDuplicate,
    onBatchLinkSchedule,
    onBatchUnlinkSchedule,
    onBatchDelete,
  } = useTransactionBatchActions();

  return (
    <AccountInternal
      splitsExpandedDispatch={splitsExpandedDispatch}
      onBatchEdit={onBatchEdit}
      onBatchDuplicate={onBatchDuplicate}
      onBatchLinkSchedule={onBatchLinkSchedule}
      onBatchUnlinkSchedule={onBatchUnlinkSchedule}
      onBatchDelete={onBatchDelete}
      {...props}
    />
  );
}

export function Account() {
  const params = useParams();
  const location = useLocation();

  const { grouped: categoryGroups } = useCategories();
  const newTransactions = useSelector(state => state.queries.newTransactions);
  const matchedTransactions = useSelector(
    state => state.queries.matchedTransactions,
  );
  const accounts = useAccounts();
  const payees = usePayees();
  const failedAccounts = useFailedAccounts();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';
  const [hideFraction] = useSyncedPref('hideFraction');
  const [expandSplits] = useLocalPref('expand-splits');
  const [showBalances, setShowBalances] = useSyncedPref(
    `show-balances-${params.id}`,
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
  const lastUndoState = useSelector(state => state.app.lastUndoState);
  const filterConditions = location?.state?.filterConditions || [];

  const savedFiters = useFilters();
  const actionCreators = useActions();

  const transform = useDefaultSchedulesQueryTransform(params.id);

  return (
    <SchedulesProvider transform={transform}>
      <SplitsExpandedProvider
        initialMode={expandSplits ? 'collapse' : 'expand'}
      >
        <AccountHack
          newTransactions={newTransactions}
          matchedTransactions={matchedTransactions}
          accounts={accounts}
          failedAccounts={failedAccounts}
          dateFormat={dateFormat}
          hideFraction={String(hideFraction) === 'true'}
          expandSplits={expandSplits}
          showBalances={String(showBalances) === 'true'}
          setShowBalances={showBalances =>
            setShowBalances(String(showBalances))
          }
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
          lastUndoState={lastUndoState}
          filterConditions={filterConditions}
          categoryGroups={categoryGroups}
          {...actionCreators}
          accountId={params.id}
          categoryId={location?.state?.categoryId}
          location={location}
          savedFilters={savedFiters}
        />
      </SplitsExpandedProvider>
    </SchedulesProvider>
  );
}
