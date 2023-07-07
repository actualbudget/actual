import React, { PureComponent, createRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Navigate, useParams, useLocation, useMatch } from 'react-router-dom';

import { debounce } from 'debounce';
import { bindActionCreators } from 'redux';

import * as actions from 'loot-core/src/client/actions';
import { useFilters } from 'loot-core/src/client/data-hooks/filters';
import {
  SchedulesProvider,
  useCachedSchedules,
} from 'loot-core/src/client/data-hooks/schedules';
import * as queries from 'loot-core/src/client/queries';
import q, { runQuery, pagedQuery } from 'loot-core/src/client/query-helpers';
import { send, listen } from 'loot-core/src/platform/client/fetch';
import { currentDay } from 'loot-core/src/shared/months';
import {
  deleteTransaction,
  updateTransaction,
  realizeTempTransactions,
  ungroupTransaction,
  ungroupTransactions,
} from 'loot-core/src/shared/transactions';
import { applyChanges, groupById } from 'loot-core/src/shared/util';

import { SelectedProviderWithItems } from '../../hooks/useSelected';
import { authorizeBank } from '../../nordigen';
import { styles, colors } from '../../style';
import { useActiveLocation } from '../ActiveLocation';
import { View, Text, Button } from '../common';
import TransactionList from '../transactions/TransactionList';
import {
  SplitsExpandedProvider,
  useSplitsExpanded,
} from '../transactions/TransactionsTable';

import { AccountHeader } from './Header';

function EmptyMessage({ onAdd }) {
  return (
    <View
      style={{
        backgroundColor: 'white',
        flex: 1,
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: colors.n9,
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

function AllTransactions({ account = {}, transactions, filtered, children }) {
  const { id: accountId } = account;
  let scheduleData = useCachedSchedules();

  let schedules = useMemo(
    () =>
      scheduleData
        ? scheduleData.schedules.filter(
            s =>
              !s.completed &&
              ['due', 'upcoming', 'missed'].includes(
                scheduleData.statuses.get(s.id),
              ),
          )
        : [],
    [scheduleData],
  );

  let prependTransactions = useMemo(() => {
    return schedules.map(schedule => ({
      id: 'preview/' + schedule.id,
      payee: schedule._payee,
      account: schedule._account,
      amount: schedule._amount,
      date: schedule.next_date,
      notes: scheduleData.statuses.get(schedule.id),
      schedule: schedule.id,
      _inverse: accountId !== schedule._account,
    }));
  }, [schedules, accountId]);

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

class AccountInternal extends PureComponent {
  constructor(props) {
    super(props);
    this.paged = null;
    this.table = createRef();
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
      showCleared: props.showCleared,
      editingName: false,
      isAdding: false,
      latestDate: null,
      filterId: [],
      conditionsOp: 'and',
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
          ...locationState.filter,
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
            transactionCount: this.paged.getTotalCount(),
            transactionsFiltered: isFiltered,
            loading: false,
            workingHard: false,
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

  componentWillReceiveProps(nextProps) {
    if (this.props.accountId !== nextProps.accountId) {
      this.setState(
        {
          editingName: false,
          loading: true,
          search: '',
          showBalances: nextProps.showBalances,
          balances: [],
          showCleared: nextProps.showCleared,
        },
        () => {
          this.fetchTransactions();
        },
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
          this.props.dateFormat,
        ),
        true,
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
          { name: 'Financial Files', extensions: ['qif', 'ofx', 'qfx', 'csv'] },
        ],
      });

      if (res) {
        this.props.pushModal('import-transactions', {
          accountId,
          filename: res[0],
          onImported: didChange => {
            if (didChange) {
              this.fetchTransactions();
            }
          },
        });
      }
    }
  };

  onExport = async accountName => {
    let exportedTransactions = await send('transactions-export-query', {
      query: this.currentQuery.serialize(),
    });
    let normalizedName =
      accountName && accountName.replace(/[()]/g, '').replace(/\s+/g, '-');
    let filename = `${normalizedName || 'transactions'}.csv`;

    window.Actual.saveFile(
      exportedTransactions,
      filename,
      'Export Transactions',
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
      },
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
        .select([{ balance: { $sumOver: '$amount' } }]),
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
    if (name.trim().length) {
      const accountId = this.props.accountId;
      const account = this.props.accounts.find(
        account => account.id === accountId,
      );
      this.props.updateAccount({ ...account, name });
      this.setState({ editingName: false });
    }
  };

  onToggleExtraBalances = () => {
    let { accountId, showExtraBalances } = this.props;
    let key = 'show-extra-balances-' + accountId || 'all-accounts';

    this.props.savePrefs({ [key]: !showExtraBalances });
  };

  onMenuSelect = async item => {
    const accountId = this.props.accountId;
    const account = this.props.accounts.find(
      account => account.id === accountId,
    );

    switch (item) {
      case 'link':
        authorizeBank(this.props.pushModal, { upgradingAccountId: accountId });
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
      case 'toggle-cleared':
        if (this.state.showCleared) {
          this.props.savePrefs({ ['hide-cleared-' + accountId]: true });
          this.setState({ showCleared: false });
        } else {
          this.props.savePrefs({ ['hide-cleared-' + accountId]: false });
          this.setState({ showCleared: true });
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

    return account.name;
  }

  getBalanceQuery(account, id) {
    return {
      name: `balance-query-${id}`,
      query: this.makeRootQuery().calculate({ $sum: '$amount' }),
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
        notes: 'Reconciliation balance adjustment',
      },
    ]);

    // Optimistic UI: update the transaction list before sending the data to the database
    this.setState({
      transactions: [...this.state.transactions, ...reconciliationTransactions],
    });

    // sync the reconciliation transaction
    await send('transactions-batch-update', {
      added: reconciliationTransactions,
    });
    await this.refetchTransactions();
  };

  onShowTransactions = async ids => {
    this.onApplyFilter({
      customName: 'Selected transactions',
      filter: { id: { $oneof: ids } },
    });
  };

  onBatchEdit = async (name, ids) => {
    let onChange = async (name, value) => {
      this.setState({ workingHard: true });

      let { data } = await runQuery(
        q('transactions')
          .filter({ id: { $oneof: ids } })
          .select('*')
          .options({ splits: 'grouped' }),
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
          [name]: value,
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

  onBatchDuplicate = async ids => {
    this.setState({ workingHard: true });

    let { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );

    let changes = {
      added: data
        .reduce((newTransactions, trans) => {
          return newTransactions.concat(
            realizeTempTransactions(ungroupTransaction(trans)),
          );
        }, [])
        .map(({ sort_order, ...trans }) => ({ ...trans })),
    };

    await send('transactions-batch-update', changes);

    await this.refetchTransactions();
  };

  onBatchDelete = async ids => {
    this.setState({ workingHard: true });

    let { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
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
      updated: ids.map(id => ({ id, schedule: null })),
    });

    await this.refetchTransactions();
  };

  onCreateRule = async ids => {
    let { data } = await runQuery(
      q('transactions')
        .filter({ id: { $oneof: ids } })
        .select('*')
        .options({ splits: 'grouped' }),
    );
    let transactions = ungroupTransactions(data);
    let payeeCondition = transactions[0].imported_payee
      ? {
          field: 'imported_payee',
          op: 'is',
          value: transactions[0].imported_payee,
          type: 'string',
        }
      : {
          field: 'payee',
          op: 'is',
          value: transactions[0].payee,
          type: 'id',
        };

    let rule = {
      stage: null,
      conditionsOp: 'and',
      conditions: [payeeCondition],
      actions: [
        {
          op: 'set',
          field: 'category',
          value: transactions[0].category,
          type: 'id',
        },
      ],
    };

    this.props.pushModal('edit-rule', { rule });
  };

  onCondOpChange = (value, filters) => {
    this.setState({ conditionsOp: value });
    this.setState({ filterId: { ...this.state.filterId, status: 'changed' } });
    this.applyFilters([...filters]);
  };

  onReloadSavedFilter = (savedFilter, item) => {
    if (item === 'reload') {
      let [getFilter] = this.props.filtersList.filter(
        f => f.id === this.state.filterId.id,
      );
      this.setState({ conditionsOp: getFilter.conditionsOp });
      this.applyFilters([...getFilter.conditions]);
    } else {
      savedFilter.status &&
        this.setState({ conditionsOp: savedFilter.conditionsOp }) &&
        this.applyFilters([...savedFilter.conditions]);
    }
    this.setState({ filterId: { ...this.state.filterId, ...savedFilter } });
  };

  onClearFilters = () => {
    this.setState({ conditionsOp: 'and' });
    this.setState({ filterId: [] });
    this.applyFilters([]);
  };

  onUpdateFilter = (oldFilter, updatedFilter) => {
    this.applyFilters(
      this.state.filters.map(f => (f === oldFilter ? updatedFilter : f)),
    );
    this.setState({
      filterId: {
        ...this.state.filterId,
        status: this.state.filterId && 'changed',
      },
    });
  };

  onDeleteFilter = filter => {
    this.applyFilters(this.state.filters.filter(f => f !== filter));
    this.state.filters.length === 1
      ? this.setState({ filterId: [] }) &&
        this.setState({ conditionsOp: 'and' })
      : this.setState({
          filterId: {
            ...this.state.filterId,
            status: this.state.filterId && 'changed',
          },
        });
  };

  onApplyFilter = async cond => {
    let filters = this.state.filters;
    if (cond.customName) {
      filters = filters.filter(f => f.customName !== cond.customName);
    }
    if (cond.conditions) {
      this.setState({ filterId: { ...cond, status: 'saved' } });
      this.setState({ conditionsOp: cond.conditionsOp });
      this.applyFilters([...cond.conditions]);
    } else {
      this.setState({
        filterId: {
          ...this.state.filterId,
          status: this.state.filterId && 'changed',
        },
      });
      this.applyFilters([...filters, cond]);
    }
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
        conditions: conditions.filter(cond => !cond.customName),
      });
      const conditionsOpKey = this.state.conditionsOp === 'or' ? '$or' : '$and';
      this.currentQuery = this.rootQuery.filter({
        [conditionsOpKey]: [...filters, ...customFilters],
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
      dateFormat,
      hideFraction,
      addNotification,
      accountsSyncing,
      replaceModal,
      showExtraBalances,
      accountId,
      categoryId,
    } = this.props;
    let {
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
    } = this.state;

    let account = accounts.find(account => account.id === accountId);
    const accountName = this.getAccountTitle(account, accountId);

    if (!accountName && !loading) {
      // This is probably an account that was deleted, so redirect to
      // all accounts
      return <Navigate to="/accounts" replace />;
    }

    let category = categoryGroups
      .flatMap(g => g.categories)
      .find(category => category.id === categoryId);

    let showEmptyMessage = !loading && !accountId && accounts.length === 0;

    let isNameEditable =
      accountId &&
      accountId !== 'budgeted' &&
      accountId !== 'offbudget' &&
      accountId !== 'uncategorized';

    let balanceQuery = this.getBalanceQuery(account, accountId);

    return (
      <AllTransactions
        account={account}
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
              <View style={[styles.page]}>
                <AccountHeader
                  tableRef={this.table}
                  editingName={editingName}
                  isNameEditable={isNameEditable}
                  workingHard={workingHard}
                  account={account}
                  filterId={filterId}
                  filtersList={this.props.filtersList}
                  location={this.props.location}
                  accountName={accountName}
                  accountsSyncing={accountsSyncing}
                  accounts={accounts}
                  transactions={transactions}
                  showBalances={showBalances}
                  showExtraBalances={showExtraBalances}
                  showCleared={showCleared}
                  showEmptyMessage={showEmptyMessage}
                  balanceQuery={balanceQuery}
                  canCalculateBalance={this.canCalculateBalance}
                  reconcileAmount={reconcileAmount}
                  search={this.state.search}
                  filters={this.state.filters}
                  conditionsOp={this.state.conditionsOp}
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
                  onBatchDuplicate={this.onBatchDuplicate}
                  onBatchEdit={this.onBatchEdit}
                  onBatchUnlink={this.onBatchUnlink}
                  onCreateRule={this.onCreateRule}
                  onUpdateFilter={this.onUpdateFilter}
                  onClearFilters={this.onClearFilters}
                  onReloadSavedFilter={this.onReloadSavedFilter}
                  onCondOpChange={this.onCondOpChange}
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
                    category={category}
                    categoryGroups={categoryGroups}
                    payees={payees}
                    balances={
                      showBalances && this.canCalculateBalance()
                        ? balances
                        : null
                    }
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
                    isFiltered={
                      this.state.search !== '' || this.state.filters.length > 0
                    }
                    dateFormat={dateFormat}
                    hideFraction={hideFraction}
                    addNotification={addNotification}
                    renderEmpty={() =>
                      showEmptyMessage ? (
                        <EmptyMessage
                          onAdd={() => replaceModal('add-account')}
                        />
                      ) : !loading ? (
                        <View
                          style={{
                            marginTop: 20,
                            textAlign: 'center',
                            fontStyle: 'italic',
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
                        order: 'desc',
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
  let match = useMatch(props.location.pathname);

  return (
    <AccountInternal
      {...props}
      match={match}
      splitsExpandedDispatch={splitsExpandedDispatch}
    />
  );
}

export default function Account() {
  let params = useParams();
  let location = useLocation();
  let activeLocation = useActiveLocation();

  let state = useSelector(state => ({
    newTransactions: state.queries.newTransactions,
    matchedTransactions: state.queries.matchedTransactions,
    accounts: state.queries.accounts,
    failedAccounts: state.account.failedAccounts,
    categoryGroups: state.queries.categories.grouped,
    dateFormat: state.prefs.local.dateFormat || 'MM/dd/yyyy',
    hideFraction: state.prefs.local.hideFraction || false,
    expandSplits: state.prefs.local['expand-splits'],
    showBalances: params.id && state.prefs.local['show-balances-' + params.id],
    showCleared: params.id && !state.prefs.local['hide-cleared-' + params.id],
    showExtraBalances:
      state.prefs.local['show-extra-balances-' + params.id || 'all-accounts'],
    payees: state.queries.payees,
    modalShowing: state.modals.modalStack.length > 0,
    accountsSyncing: state.account.accountsSyncing,
    lastUndoState: state.app.lastUndoState,
  }));

  let dispatch = useDispatch();
  let filtersList = useFilters();
  let actionCreators = useMemo(
    () => bindActionCreators(actions, dispatch),
    [dispatch],
  );

  let transform = useMemo(() => {
    let filterByAccount = queries.getAccountFilter(params.id, '_account');
    let filterByPayee = queries.getAccountFilter(
      params.id,
      '_payee.transfer_acct',
    );

    // Never show schedules on these pages
    if (
      (location.state && location.state.filter) ||
      params.id === 'uncategorized'
    ) {
      filterByAccount = { id: null };
      filterByPayee = { id: null };
    }

    return q => {
      q = q.filter({
        $and: [{ '_account.closed': false }],
        $or: [filterByAccount, filterByPayee],
      });
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
            !!(activeLocation.state && activeLocation.state.parent)
          }
          accountId={params.id}
          categoryId={activeLocation?.state?.filter?.category}
          location={location}
          filtersList={filtersList}
        />
      </SplitsExpandedProvider>
    </SchedulesProvider>
  );
}
